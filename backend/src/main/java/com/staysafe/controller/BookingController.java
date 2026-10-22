package com.staysafe.controller;

import com.staysafe.dto.Dtos.BookingDto;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.User;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.service.InventoryService;
import com.staysafe.service.NotificationService;
import com.staysafe.service.PaymentService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingRepository bookings;
    private final PropertyRepository properties;
    private final NotificationService notifications;
    private final PaymentService payments;
    private final InventoryService inventory;

    public BookingController(BookingRepository bookings, PropertyRepository properties,
                             NotificationService notifications, PaymentService payments,
                             InventoryService inventory) {
        this.bookings = bookings;
        this.properties = properties;
        this.notifications = notifications;
        this.payments = payments;
        this.inventory = inventory;
    }

    @GetMapping("/me")
    public List<BookingDto> mine(@AuthenticationPrincipal User user) {
        return bookings.findByUserOrderByCreatedAtDesc(user).stream().map(Mapper::booking).toList();
    }

    /**
     * Cancel a booking (free up to 48h before check-in) and refund the Razorpay payment.
     * If Razorpay rejects the refund the whole cancellation is rolled back.
     */
    @PutMapping("/{id}/cancel")
    @Transactional
    public BookingDto cancel(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Booking b = bookings.findById(id).orElseThrow(() -> ApiException.notFound("Booking not found"));
        if (!b.getUser().getId().equals(user.getId())) throw ApiException.forbidden("Not your booking");
        if (!"Confirmed".equals(b.getStatus())) throw ApiException.badRequest("Only confirmed bookings can be cancelled");
        if (b.getCheckIn().isBefore(LocalDate.now().plusDays(2)))
            throw ApiException.badRequest("Free cancellation is only available up to 48 hours before check-in");

        b.setStatus("Cancelled");
        bookings.save(b);
        inventory.release(b.getRoomOption());          // the bed becomes available again

        Property p = b.getProperty();
        p.setBookingsCount(Math.max(0, p.getBookingsCount() - 1));
        properties.save(p);

        boolean refunding = payments.refundForCancelledBooking(b);

        notifications.notify(user, "Booking Cancelled",
                "Booking " + b.getCode() + " cancelled."
                        + (refunding ? " Your refund has been initiated (3-5 business days)." : ""), "booking");
        notifications.notify(p.getOwner(), "Booking Cancelled",
                user.getName() + " cancelled booking " + b.getCode() + " for " + p.getName() + ".", "booking");
        return Mapper.booking(b);
    }
}
