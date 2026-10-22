package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** One Razorpay order / payment for a stay. The booking is created only after the payment is captured. */
@Entity
@Table(name = "payment", indexes = @Index(columnList = "razorpayPaymentId"))
@Getter @Setter @NoArgsConstructor
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) private User user;
    @ManyToOne(optional = false) private Property property;

    @ManyToOne
    private RoomOption roomOption;

    // booking draft (so a webhook can create the booking even if the customer closed the browser)
    private LocalDate checkIn;
    private LocalDate checkOut;
    private String guests;

    private int amount;                           // INR (rupees)
    private String currency = "INR";

    @Column(unique = true)
    private String razorpayOrderId;
    private String razorpayPaymentId;
    @Column(length = 200)
    private String razorpaySignature;

    private String status = "CREATED";            // CREATED | AUTHORIZED | CAPTURED | FAILED | REFUNDED | PARTIALLY_REFUNDED
    private String method;                        // upi | card | netbanking | wallet ...
    @Column(length = 500)
    private String failureReason;

    @OneToOne
    private Booking booking;

    private int refundedAmount;                   // INR
    private String refundId;
    private String refundStatus = "NONE";         // NONE | INITIATED | PROCESSED | FAILED
    private String disputeStatus;                 // CREATED | UNDER_REVIEW | ACTION_REQUIRED | WON | LOST | CLOSED

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime capturedAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }
}
