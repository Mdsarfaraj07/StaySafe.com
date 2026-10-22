package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;                 // e.g. BK-4821

    @ManyToOne(optional = false) private User user;
    @ManyToOne(optional = false) private Property property;

    @ManyToOne
    private RoomOption roomOption;       // null for bookings made before room options existed

    private LocalDate checkIn;
    private LocalDate checkOut;
    private String guests;
    private int amount;
    private String status;               // Confirmed | Cancelled  (Completed is derived)
    private String paymentMethod;
    private String paymentRef;
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
