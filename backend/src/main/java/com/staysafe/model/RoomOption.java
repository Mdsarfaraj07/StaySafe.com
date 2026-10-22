package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;

/** A bookable room type of a property, e.g. "Double sharing, AC" with its own price per bed and bed inventory. */
@Entity
@Getter @Setter @NoArgsConstructor
public class RoomOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Property property;

    private String label;
    private int occupancy;            // 1 = single room, 2 = double sharing, 3 = triple ...
    private int pricePerBed;          // INR per month
    private int totalBeds;
    private int availableBeds;
    private boolean acRoom;
    private boolean attachedBathroom;
    private boolean active = true;    // removed options are hidden, never deleted (bookings keep pointing at them)
}
