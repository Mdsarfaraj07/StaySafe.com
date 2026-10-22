package com.staysafe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.*;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.PaymentRepository;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.repo.RoomOptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Razorpay payment lifecycle:
 *   order  ->  checkout  ->  verify (signature + server-side fetch + capture)  ->  booking
 * and the same state machine driven by webhooks (authorized / captured / failed / order.paid /
 * refunds / disputes / settlements), so nothing is lost if the customer closes the browser.
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final Set<String> FINAL = Set.of("CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED");

    private final PaymentRepository payments;
    private final PropertyRepository properties;
    private final BookingRepository bookings;
    private final RazorpayClient razorpay;
    private final NotificationService notifications;
    private final RoomOptionRepository rooms;
    private final EligibilityService eligibility;
    private final InventoryService inventory;
    private final EmailService emailService;

    public PaymentService(PaymentRepository payments, PropertyRepository properties, BookingRepository bookings,
                          RazorpayClient razorpay, NotificationService notifications,
                          RoomOptionRepository rooms, EligibilityService eligibility, InventoryService inventory, EmailService emailService) {
        this.payments = payments;
        this.properties = properties;
        this.bookings = bookings;
        this.razorpay = razorpay;
        this.notifications = notifications;
        this.rooms = rooms;
        this.eligibility = eligibility;
        this.inventory = inventory;
        this.emailService = emailService;
    }

    // =====================================================================
    //  1. create order
    // =====================================================================
    @Transactional
    public OrderResponse createOrder(User user, OrderRequest req) {
        if (user.getRole() != Role.CUSTOMER) throw ApiException.forbidden("Only customers can book stays");
        Property p = properties.findById(req.propertyId()).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!"Active".equals(p.getStatus())) throw ApiException.badRequest("This property is not open for booking");
        if (req.checkIn().isBefore(LocalDate.now())) throw ApiException.badRequest("Check-in cannot be in the past");
        if (!req.checkOut().isAfter(req.checkIn())) throw ApiException.badRequest("Check-out must be after check-in");

        RoomOption room = rooms.findById(req.roomId()).orElseThrow(() -> ApiException.notFound("Room option not found"));
        if (!room.getProperty().getId().equals(p.getId()) || !room.isActive()) throw ApiException.badRequest("Invalid room option");
        if (room.getAvailableBeds() < 1) throw ApiException.conflict("No beds are left in \"" + room.getLabel() + "\"");
        List<String> problems = eligibility.problems(user, p);
        if (!problems.isEmpty()) throw ApiException.badRequest(String.join(" ", problems));

        Payment pay = new Payment();
        pay.setUser(user);
        pay.setProperty(p);
        pay.setCheckIn(req.checkIn());
        pay.setCheckOut(req.checkOut());
        pay.setGuests(req.guests() == null ? "1 Guest" : req.guests());
        pay.setRoomOption(room);
        pay.setAmount(room.getPricePerBed());           // price comes from the DB, never from the browser
        payments.save(pay);

        JsonNode order = razorpay.createOrder(pay.getAmount() * 100L, "rcpt_" + pay.getId(),
                Map.of("paymentId", String.valueOf(pay.getId()), "propertyId", String.valueOf(p.getId()),
                        "customer", user.getEmail()));
        pay.setRazorpayOrderId(order.path("id").asText());
        payments.save(pay);

        return new OrderResponse(pay.getRazorpayOrderId(), pay.getAmount() * 100L, "INR", razorpay.keyId(),
                pay.getId(), p.getName(), "Stay at " + p.getName() + " (" + room.getLabel() + ")");
    }

    // =====================================================================
    //  2. verify checkout result (called by the browser after Razorpay Checkout succeeds)
    // =====================================================================
    @Transactional(noRollbackFor = ApiException.class)   // keep refund / failure state when we answer with an error
    public BookingDto verify(User user, VerifyRequest r) {
        Payment p = payments.findWithLockByRazorpayOrderId(r.razorpayOrderId())
                .orElseThrow(() -> ApiException.notFound("Payment order not found"));
        if (!p.getUser().getId().equals(user.getId())) throw ApiException.forbidden("Not your payment");

        if (!razorpay.verifyCheckoutSignature(r.razorpayOrderId(), r.razorpayPaymentId(), r.razorpaySignature()))
            throw ApiException.badRequest("Payment signature verification failed");
        p.setRazorpaySignature(r.razorpaySignature());

        // never trust the browser: confirm the payment with Razorpay itself
        JsonNode rp = razorpay.fetchPayment(r.razorpayPaymentId());
        if (!p.getRazorpayOrderId().equals(rp.path("order_id").asText())
                || rp.path("amount").asLong() != p.getAmount() * 100L)
            throw ApiException.badRequest("Payment does not match this order");

        applyPaymentEntity(p, rp);
        payments.save(p);

        if ("FAILED".equals(p.getStatus()))
            throw ApiException.badRequest(p.getFailureReason() == null ? "Payment failed" : p.getFailureReason());
        if (!"CAPTURED".equals(p.getStatus()))
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Payment is authorised but not captured yet. You will get a confirmation shortly.");

        Booking booking = finalizeBooking(p);
        if (booking == null)
            throw ApiException.conflict("Sorry, the last bed in this room was just taken. Your payment of ₹" + p.getAmount() + " is being refunded.");
        return Mapper.booking(booking);
    }

    // =====================================================================
    //  3. queries
    // =====================================================================
    @Transactional(readOnly = true)
    public List<PaymentDto> mine(User user) {
        return payments.findByUserOrderByCreatedAtDesc(user).stream().map(Mapper::payment).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentDto> adminList(String status) {
        List<Payment> rows = (status == null || status.isBlank() || status.equalsIgnoreCase("ALL"))
                ? payments.findTop200ByOrderByCreatedAtDesc()
                : payments.findTop200ByStatusOrderByCreatedAtDesc(status.toUpperCase());
        return rows.stream().map(Mapper::payment).toList();
    }

    // =====================================================================
    //  4. refunds
    // =====================================================================
    /** Called when a customer cancels. Returns true when a refund was started with Razorpay. */
    @Transactional
    public boolean refundForCancelledBooking(Booking b) {
        Payment p = payments.findByBooking(b).orElse(null);
        if (p == null || !"CAPTURED".equals(p.getStatus()) || !refundable(p)) return false;
        initiateRefund(p, p.getAmount() * 100L, "Booking cancelled by customer");
        return true;
    }

    @Transactional
    public PaymentDto adminRefund(Long id, Integer amountInr) {
        Payment p = payments.findById(id).orElseThrow(() -> ApiException.notFound("Payment not found"));
        int inr = amountInr == null ? p.getAmount() : amountInr;
        initiateRefund(p, inr * 100L, "Refund issued by StaySafe admin");
        return Mapper.payment(p);
    }

    private boolean refundable(Payment p) {
        return "NONE".equals(p.getRefundStatus()) || "FAILED".equals(p.getRefundStatus()) || p.getRefundStatus() == null;
    }

    private void initiateRefund(Payment p, long paise, String reason) {
        if (!"CAPTURED".equals(p.getStatus())) throw ApiException.badRequest("Only captured payments can be refunded");
        if (!refundable(p)) throw ApiException.conflict("A refund has already been initiated for this payment");
        if (paise <= 0 || paise > p.getAmount() * 100L) throw ApiException.badRequest("Invalid refund amount");

        JsonNode r = razorpay.refund(p.getRazorpayPaymentId(), paise,
                Map.of("reason", reason, "booking", p.getBooking() == null ? "-" : p.getBooking().getCode()));
        boolean processed = "processed".equals(r.path("status").asText());
        p.setRefundId(r.path("id").asText());
        p.setRefundedAmount((int) (paise / 100));
        p.setRefundStatus(processed ? "PROCESSED" : "INITIATED");
        if (processed) p.setStatus(p.getRefundedAmount() >= p.getAmount() ? "REFUNDED" : "PARTIALLY_REFUNDED");
        payments.save(p);

        notifications.notify(p.getUser(), "Refund " + (processed ? "Processed" : "Initiated"),
                "₹" + p.getRefundedAmount() + " refund for " + p.getProperty().getName()
                        + (processed ? " has been processed." : " is on its way (3-5 business days) to your original payment method."),
                "payment");
        if (p.getRefundedAmount() >= p.getAmount()) cancelBookingForRefund(p);
    }

    private void cancelBookingForRefund(Payment p) {
        Booking b = p.getBooking();
        if (b == null || !"Confirmed".equals(b.getStatus())) return;
        b.setStatus("Cancelled");
        bookings.save(b);
        inventory.release(b.getRoomOption());
        Property prop = b.getProperty();
        prop.setBookingsCount(Math.max(0, prop.getBookingsCount() - 1));
        properties.save(prop);
        notifications.notify(prop.getOwner(), "Booking Cancelled",
                "Booking " + b.getCode() + " for " + prop.getName() + " was cancelled and refunded.", "booking");
    }

    // =====================================================================
    //  5. webhook dispatcher  (signature + idempotency are handled in WebhookService)
    // =====================================================================
    /** @return PROCESSED or IGNORED */
    @Transactional
    public String dispatch(String event, JsonNode root) {
        JsonNode payload = root.path("payload");
        switch (event) {
            case "payment.authorized", "payment.captured", "payment.failed", "order.paid":
                return onPaymentEvent(payload.path("payment").path("entity"));
            case "refund.created", "refund.processed", "refund.failed":
                return onRefund(event, payload);
            case "settlement.processed":
                return onSettlement(payload.path("settlement").path("entity"));
            default:
                if (event.startsWith("payment.dispute."))
                    return onDispute(event, payload.path("dispute").path("entity"));
                log.info("Ignoring Razorpay webhook event {}", event);
                return "IGNORED";
        }
    }

    private String onPaymentEvent(JsonNode entity) {
        Payment p = findPaymentFor(entity);
        if (p == null) return "IGNORED";                       // payment not created by this app
        long amt = entity.path("amount").asLong(-1);
        if (amt != -1 && amt != p.getAmount() * 100L) {
            log.warn("Webhook amount mismatch for order {}", p.getRazorpayOrderId());
            return "IGNORED";
        }
        applyPaymentEntity(p, entity);
        if ("CAPTURED".equals(p.getStatus())) finalizeBooking(p);   // customer may have closed the tab
        payments.save(p);
        return "PROCESSED";
    }

    private String onRefund(String event, JsonNode payload) {
        JsonNode refund = payload.path("refund").path("entity");
        String payId = refund.path("payment_id").asText("");
        Payment p = payId.isEmpty() ? null : payments.findWithLockByRazorpayPaymentId(payId).orElse(null);
        if (p == null) return "IGNORED";

        int inr = (int) (refund.path("amount").asLong(0) / 100);
        String refundId = refund.path("id").asText(p.getRefundId());
        switch (event) {
            case "refund.created" -> {
                p.setRefundId(refundId);
                if (!"PROCESSED".equals(p.getRefundStatus())) p.setRefundStatus("INITIATED");
                p.setRefundedAmount(Math.max(p.getRefundedAmount(), inr));
                if (p.getRefundedAmount() >= p.getAmount()) cancelBookingForRefund(p);   // e.g. refunded from the Razorpay dashboard
            }
            case "refund.processed" -> {
                p.setRefundId(refundId);
                p.setRefundStatus("PROCESSED");
                p.setRefundedAmount(Math.max(p.getRefundedAmount(), inr));
                p.setStatus(p.getRefundedAmount() >= p.getAmount() ? "REFUNDED" : "PARTIALLY_REFUNDED");
                if (p.getRefundedAmount() >= p.getAmount()) cancelBookingForRefund(p);
                notifications.notify(p.getUser(), "Refund Processed",
                        "₹" + inr + " has been refunded for " + p.getProperty().getName() + ".", "payment");
            }
            default -> {   // refund.failed
                p.setRefundStatus("FAILED");
                p.setRefundedAmount(0);
                notifications.notifyRole(Role.ADMIN, "Refund Failed",
                        "Refund for payment " + payId + " (" + p.getUser().getEmail() + ") failed. Retry it from the Payments tab.", "payment");
            }
        }
        payments.save(p);
        return "PROCESSED";
    }

    private String onDispute(String event, JsonNode entity) {
        String payId = entity.path("payment_id").asText("");
        Payment p = payId.isEmpty() ? null : payments.findWithLockByRazorpayPaymentId(payId).orElse(null);
        if (p == null) return "IGNORED";
        String st = event.substring("payment.dispute.".length()).toUpperCase();
        p.setDisputeStatus(st);
        payments.save(p);

        String msg = "Dispute on payment " + payId + " (₹" + p.getAmount() + ", " + p.getUser().getEmail()
                + "), reason: " + entity.path("reason_code").asText("n/a");
        notifications.notifyRole(Role.ADMIN, "Payment Dispute " + st.replace('_', ' '), msg, "audit");
        if ("CREATED".equals(st) && p.getBooking() != null)
            notifications.notify(p.getProperty().getOwner(), "Payment Dispute Raised",
                    "A dispute was raised on booking " + p.getBooking().getCode() + ".", "audit");
        return "PROCESSED";
    }

    private String onSettlement(JsonNode entity) {
        long inr = entity.path("amount").asLong(0) / 100;
        notifications.notifyRole(Role.ADMIN, "Settlement Processed",
                "Razorpay settled ₹" + inr + " (UTR " + entity.path("utr").asText("n/a") + ").", "payout");
        return "PROCESSED";
    }

    // =====================================================================
    //  shared state-machine helpers
    // =====================================================================
    private Payment findPaymentFor(JsonNode entity) {
        String orderId = entity.path("order_id").asText("");
        if (!orderId.isEmpty()) {
            Payment byOrder = payments.findWithLockByRazorpayOrderId(orderId).orElse(null);
            if (byOrder != null) return byOrder;
        }
        String id = entity.path("id").asText("");
        return id.isEmpty() ? null : payments.findWithLockByRazorpayPaymentId(id).orElse(null);
    }

    /** Moves the local payment forward according to a Razorpay payment entity (API response or webhook). */
    private void applyPaymentEntity(Payment p, JsonNode n) {
        String status = n.path("status").asText("");
        String rpId = n.path("id").asText(null);
        String method = n.path("method").asText(null);
        switch (status) {
            case "captured" -> {
                adopt(p, rpId, method);
                markCaptured(p);
            }
            case "authorized" -> {
                adopt(p, rpId, method);
                if (!FINAL.contains(p.getStatus())) {
                    p.setStatus("AUTHORIZED");
                    capture(p);                           // when auto-capture is off in the dashboard
                }
            }
            case "failed" -> {
                if (!FINAL.contains(p.getStatus())) {
                    if (p.getRazorpayPaymentId() == null && rpId != null) p.setRazorpayPaymentId(rpId);
                    if (method != null) p.setMethod(method);
                    String reason = n.path("error_description").asText("Payment failed");
                    p.setStatus("FAILED");
                    p.setFailureReason(reason.length() > 450 ? reason.substring(0, 450) : reason);
                    notifications.notify(p.getUser(), "Payment Failed",
                            "Your payment for " + p.getProperty().getName() + " failed: " + reason + ". You can try again.", "payment");
                }
            }
            default -> { /* created / refunded: nothing to do here */ }
        }
    }

    private void adopt(Payment p, String rpId, String method) {
        if (rpId != null) p.setRazorpayPaymentId(rpId);
        if (method != null) p.setMethod(method);
    }

    private void markCaptured(Payment p) {
        if (FINAL.contains(p.getStatus())) return;
        p.setStatus("CAPTURED");
        p.setCapturedAt(LocalDateTime.now());
        p.setFailureReason(null);
    }

    private void capture(Payment p) {
        try {
            razorpay.capturePayment(p.getRazorpayPaymentId(), p.getAmount() * 100L);
            markCaptured(p);
        } catch (ApiException e) {
            // possibly captured automatically in the meantime: re-check before giving up
            JsonNode again = razorpay.fetchPayment(p.getRazorpayPaymentId());
            if ("captured".equals(again.path("status").asText())) markCaptured(p);
            else log.warn("Capture failed for {}: {}", p.getRazorpayPaymentId(), e.getMessage());
        }
    }

    /** Idempotent: a payment creates at most one booking (callers hold the payment row lock). */
    private Booking finalizeBooking(Payment p) {
        if (p.getBooking() != null) return p.getBooking();
        Property prop = p.getProperty();

        RoomOption room = null;
        if (p.getRoomOption() != null) {
            room = rooms.findWithLockById(p.getRoomOption().getId()).orElse(null);
            if (room != null && room.getAvailableBeds() < 1) {
                // two customers paid for the last bed at the same time: refund the late one
                initiateRefund(p, p.getAmount() * 100L, "Bed no longer available");
                notifications.notify(p.getUser(), "Booking could not be completed",
                        "The last bed in " + room.getLabel() + " at " + prop.getName()
                                + " was taken just before your payment cleared. Your payment has been refunded.", "booking");
                return null;
            }
            if (room != null) {
                room.setAvailableBeds(room.getAvailableBeds() - 1);
                rooms.save(room);
            }
        }

        String code;
        do {
            code = "BK-" + (1000 + (int) (Math.random() * 9000));
        } while (bookings.existsByCode(code));

        Booking b = new Booking();
        b.setCode(code);
        b.setUser(p.getUser());
        b.setProperty(prop);
        b.setCheckIn(p.getCheckIn());
        b.setCheckOut(p.getCheckOut());
        b.setGuests(p.getGuests());
        b.setAmount(p.getAmount());
        b.setStatus("Confirmed");
        b.setPaymentMethod(p.getMethod() == null ? "razorpay" : p.getMethod());
        b.setPaymentRef(p.getRazorpayPaymentId());
        b.setRoomOption(room);
        bookings.save(b);

        p.setBooking(b);
        payments.save(p);
        prop.setBookingsCount(prop.getBookingsCount() + 1);
        properties.save(prop);

        notifications.notify(p.getUser(), "Booking Confirmed!",
                "Your bed" + (room == null ? "" : " in " + room.getLabel()) + " at " + prop.getName() + " is confirmed from " + b.getCheckIn() + ".", "booking");
        notifications.notify(p.getUser(), "Payment Receipt Issued",
                "Payment of ₹" + b.getAmount() + " received (ref " + b.getPaymentRef() + ").", "payment");
        try {
            emailService.sendBookingConfirmation(b);
        } catch (Exception ex) {
            log.error("Booking {} is confirmed but confirmation email delivery failed", b.getCode(), ex);
        }
        notifications.notify(prop.getOwner(), "New Guest Booking",
                p.getUser().getName() + " booked " + prop.getName() + " (" + b.getGuests() + ") from " + b.getCheckIn() + ".", "booking");
        return b;
    }
}
