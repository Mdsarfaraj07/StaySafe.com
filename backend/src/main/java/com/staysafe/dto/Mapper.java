package com.staysafe.dto;

import com.staysafe.dto.Dtos.*;
import com.staysafe.model.*;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class Mapper {
    private Mapper() {}

    public static UserDto user(User u) {
        String joined = u.getCreatedAt() == null ? "" : u.getCreatedAt().toLocalDate().toString();
        return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getRole().name(), u.isEnabled(), joined,
                u.getAvatarUrl());
    }

    public static RoomDto room(RoomOption r) {
        return new RoomDto(r.getId(), r.getLabel(), r.getOccupancy(), r.getPricePerBed(), r.getTotalBeds(),
                r.getAvailableBeds(), r.isAcRoom(), r.isAttachedBathroom());
    }

    public static ResidentDto resident(Resident r) {
        return new ResidentDto(r.getId(), r.getRoomOption() == null ? null : r.getRoomOption().getId(),
                r.getRoomOption() == null ? null : r.getRoomOption().getLabel(), r.getName(), r.getGender(), r.getAge(),
                r.getOccupation(), r.getOrganization(), r.getFoodPreference(), r.isSmokes(), r.isDrinks(),
                r.getSleepSchedule(), r.getBio(), r.getMoveInDate());
    }

    public static TenantProfileDto tenant(TenantProfile t) {
        return new TenantProfileDto(t.getGender(), t.getDob(), t.getDob() == null ? null : com.staysafe.service.SharingRules.age(t.getDob()),
                t.getOccupation(), t.getOrganization(), t.getFoodPreference(), t.isSmokes(), t.isDrinks(),
                t.getSleepSchedule(), t.getLanguages(), t.getBio(), t.isShareWithRoommates(),
                com.staysafe.service.EligibilityService.isComplete(t));
    }

    public static PropertyDto property(Property p) {
        List<RoomDto> rooms = p.getRooms().stream().filter(RoomOption::isActive).map(Mapper::room).toList();
        int beds = rooms.stream().mapToInt(RoomDto::availableBeds).sum();
        return new PropertyDto(p.getId(), p.getName(), p.getType(), p.getLocation(), p.getPrice(), p.getRating(),
                p.getReviewsCount(), p.isVerified(), p.getImage(), p.getImages(), p.getAmenities(),
                p.getDescription(), p.getStatus(), p.getBookingsCount(), p.getOwner().getName(),
                p.getOwner().getPhone(), p.getDeposit(), p.getLatitude(), p.getLongitude(), p.getAddress(),
                com.staysafe.service.SharingRules.orDefault(p.getGenderPolicy(), "CO_ED"),
                com.staysafe.service.SharingRules.orDefault(p.getFoodPolicy(), "NON_VEG_ALLOWED"),
                com.staysafe.service.SharingRules.orDefault(p.getTenantType(), "BOTH"),
                Boolean.TRUE.equals(p.getSmokingAllowed()), Boolean.TRUE.equals(p.getDrinkingAllowed()),
                Boolean.TRUE.equals(p.getPetsAllowed()), !Boolean.FALSE.equals(p.getVisitorsAllowed()),
                rooms, beds);
    }

    public static BookingDto booking(Booking b) {
        String status = b.getStatus();
        if ("Confirmed".equals(status) && b.getCheckOut().isBefore(LocalDate.now())) status = "Completed";
        Property p = b.getProperty();
        return new BookingDto(b.getCode(), b.getId(), p.getId(), p.getName(), p.getLocation(), b.getCheckIn(),
                b.getCheckOut(), b.getGuests(), b.getAmount(), status, p.getImage(), b.getPaymentMethod(),
                b.getPaymentRef(), b.getUser().getName(), b.getUser().getEmail(), b.getUser().getPhone(),
                b.getRoomOption() == null ? null : b.getRoomOption().getLabel(),
                b.getRoomOption() == null ? 0 : b.getRoomOption().getOccupancy());
    }

    public static KycDto kyc(KycRecord k) {
        return new KycDto(k.getId(), k.getStatus(), k.getSource(), k.getIdType(), k.getIdMasked(), k.getCkycNumber(),
                k.getFullName(), k.getDob(), k.getAddress(), k.getRemarks(),
                k.getSubmittedAt() == null ? null : k.getSubmittedAt().toString(),
                k.getUser().getId(), k.getUser().getName(), k.getUser().getEmail());
    }

    public static PaymentDto payment(Payment p) {
        return new PaymentDto(p.getId(), p.getRazorpayOrderId(), p.getRazorpayPaymentId(), p.getStatus(), p.getMethod(),
                p.getAmount(), p.getCurrency(), p.getRefundedAmount(), p.getRefundStatus(), p.getDisputeStatus(),
                p.getFailureReason(), p.getUser().getName(), p.getUser().getEmail(), p.getProperty().getName(),
                p.getBooking() == null ? null : p.getBooking().getCode(),
                p.getCreatedAt() == null ? null : p.getCreatedAt().toString(),
                p.getCapturedAt() == null ? null : p.getCapturedAt().toString());
    }

    public static WebhookEventDto webhook(WebhookEvent w) {
        return new WebhookEventDto(w.getId(), w.getEventId(), w.getEventType(), w.getStatus(), w.getError(),
                w.getReceivedAt() == null ? null : w.getReceivedAt().toString());
    }

    public static TicketDto ticket(Ticket t) {
        return new TicketDto(t.getCode(), t.getId(), t.getSubject(), t.getMessage(), t.getStatus(),
                t.getResponse(), t.getUser().getName(), t.getUser().getEmail(), ago(t.getCreatedAt()));
    }

    public static NotificationDto notification(Notification n) {
        return new NotificationDto(n.getId(), n.getTitle(), n.getMessage(), n.getType(), n.isUnread(), ago(n.getCreatedAt()),
                n.getRefType(), n.getRefId());
    }

    public static ReviewDto review(Review r) {
        return new ReviewDto(r.getId(), r.getUser().getName(), r.getRating(), r.getComment(),
                r.getCreatedAt().toLocalDate().toString());
    }

    public static String ago(LocalDateTime t) {
        long m = Duration.between(t, LocalDateTime.now()).toMinutes();
        if (m < 1) return "Just now";
        if (m < 60) return m + " mins ago";
        long h = m / 60;
        if (h < 24) return h + " hours ago";
        long d = h / 24;
        return d == 1 ? "Yesterday" : d + " days ago";
    }
}
