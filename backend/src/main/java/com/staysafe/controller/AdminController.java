package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.Role;
import com.staysafe.model.Ticket;
import com.staysafe.model.User;
import com.staysafe.repo.*;
import com.staysafe.service.KycService;
import com.staysafe.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/** All endpoints require ROLE_ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository users;
    private final PropertyRepository properties;
    private final BookingRepository bookings;
    private final TicketRepository tickets;
    private final NotificationService notifications;
    private final KycService kyc;
    private final PropertyDocumentRepository propertyDocuments;

    public AdminController(UserRepository users, PropertyRepository properties, BookingRepository bookings,
                           TicketRepository tickets, NotificationService notifications, KycService kyc, PropertyDocumentRepository propertyDocuments) {
        this.users = users;
        this.properties = properties;
        this.bookings = bookings;
        this.tickets = tickets;
        this.notifications = notifications;
        this.kyc = kyc;
        this.propertyDocuments = propertyDocuments;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        List<Booking> paid = bookings.findAll().stream().filter(b -> !"Cancelled".equals(b.getStatus())).toList();
        long gross = paid.stream().mapToLong(Booking::getAmount).sum();
        return Map.of(
                "totalUsers", users.count(),
                "totalStays", properties.count(),
                "totalBookings", paid.size(),
                "platformRevenue", Math.round(gross * OwnerController.COMMISSION));
    }

    @GetMapping("/properties/pending")
    public List<PropertyDto> pending() {
        return properties.findByStatusOrderByIdAsc("Under Review").stream().map(Mapper::property).toList();
    }

    @PutMapping("/properties/{id}/approve")
    public PropertyDto approve(@PathVariable Long id) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!kyc.isVerified(p.getOwner()))
            throw ApiException.badRequest("Owner KYC is not verified yet. Review the owner's KYC first.");
        boolean electricityBill = propertyDocuments.existsByPropertyAndDocumentTypeAndStatus(p, "ELECTRICITY_BILL", "APPROVED");
        boolean authorityProof = propertyDocuments.existsByPropertyAndDocumentTypeAndStatus(p, "OWNERSHIP_PROOF", "APPROVED")
                || propertyDocuments.existsByPropertyAndDocumentTypeAndStatus(p, "RENTAL_AUTHORIZATION", "APPROVED");
        if (!electricityBill || !authorityProof)
            throw ApiException.badRequest("Approve an electricity bill and ownership/rental authorization document before activating this property.");
        p.setStatus("Active");
        p.setVerified(true);
        properties.save(p);
        notifications.notify(p.getOwner(), "Listing Approved",
                p.getName() + " is verified and now live on StaySafe!", "system");
        return Mapper.property(p);
    }

    @PutMapping("/properties/{id}/reject")
    public PropertyDto reject(@PathVariable Long id) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        p.setStatus("Rejected");
        p.setVerified(false);
        properties.save(p);
        notifications.notify(p.getOwner(), "Listing Rejected",
                p.getName() + " did not pass verification. Please update documents and resubmit.", "audit");
        return Mapper.property(p);
    }

    // ---- KYC review ----
    @GetMapping("/kyc")
    public List<KycDto> kycList(@RequestParam(defaultValue = "PENDING_REVIEW") String status) {
        return kyc.list(status);
    }

    @PutMapping("/kyc/{id}/approve")
    public KycDto kycApprove(@PathVariable Long id) {
        return kyc.review(id, true, null);
    }

    @PutMapping("/kyc/{id}/reject")
    public KycDto kycReject(@PathVariable Long id, @RequestBody(required = false) KycReview body) {
        return kyc.review(id, false, body == null ? null : body.remarks());
    }

    @GetMapping("/tickets")
    public List<TicketDto> allTickets() {
        return tickets.findAllByOrderByCreatedAtDesc().stream().map(Mapper::ticket).toList();
    }

    @PutMapping("/tickets/{id}")
    public TicketDto updateTicket(@PathVariable Long id, @RequestBody TicketUpdate req) {
        Ticket t = tickets.findById(id).orElseThrow(() -> ApiException.notFound("Ticket not found"));
        if (req.response() != null && !req.response().isBlank()) t.setResponse(req.response());
        if (req.status() != null) t.setStatus(req.status());
        tickets.save(t);
        notifications.notify(t.getUser(), "Support Ticket " + t.getCode() + " Updated",
                "Status: " + t.getStatus() + (t.getResponse() != null ? " — " + t.getResponse() : ""),
                "support", "ticket", t.getId());
        return Mapper.ticket(t);
    }

    /** Search all accounts (customers, owners, admins) by name / email / phone / id, optionally filtered by role. */
    @GetMapping("/users")
    public List<UserDto> allUsers(@RequestParam(required = false) String q,
                                  @RequestParam(required = false) String role) {
        String needle = q == null ? "" : q.trim().toLowerCase();
        Role parsed = null;
        if (role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL")) {
            try {
                parsed = Role.valueOf(role.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("Unknown role: " + role);
            }
        }
        final Role filterRole = parsed;
        return users.findAll().stream()
                .filter(u -> filterRole == null || u.getRole() == filterRole)
                .filter(u -> needle.isEmpty() || has(u.getName(), needle) || has(u.getEmail(), needle)
                        || has(u.getPhone(), needle) || String.valueOf(u.getId()).equals(needle))
                .map(Mapper::user).toList();
    }

    /** Full profile of one account with its bookings (customer / owner) and listings (owner). */
    @GetMapping("/users/{id}")
    public UserDetailDto userDetail(@PathVariable Long id) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
        List<Booking> bk;
        if (u.getRole() == Role.CUSTOMER) bk = bookings.findByUserOrderByCreatedAtDesc(u);
        else if (u.getRole() == Role.OWNER) bk = bookings.findByPropertyOwnerOrderByCreatedAtDesc(u);
        else bk = List.of();

        List<PropertyDto> props = u.getRole() == Role.OWNER
                ? properties.findByOwnerOrderByIdDesc(u).stream().map(Mapper::property).toList()
                : List.of();

        long gross = bk.stream().filter(b -> !"Cancelled".equals(b.getStatus())).mapToLong(Booking::getAmount).sum();
        long amount = u.getRole() == Role.OWNER ? Math.round(gross * (1 - OwnerController.COMMISSION)) : gross;
        return new UserDetailDto(Mapper.user(u), bk.size(), amount, props.size(),
                bk.stream().map(Mapper::booking).toList(), props,
                u.getRole() == Role.OWNER ? kyc.status(u) : null);
    }

    private static boolean has(String s, String needle) {
        return s != null && s.toLowerCase().contains(needle);
    }

    @PutMapping("/users/{id}/toggle")
    public UserDto toggleUser(@PathVariable Long id, @AuthenticationPrincipal User admin) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
        if (u.getId().equals(admin.getId())) throw ApiException.badRequest("You cannot disable your own account");
        u.setEnabled(!u.isEnabled());
        return Mapper.user(users.save(u));
    }
}
