package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

@Entity
@Getter @Setter @NoArgsConstructor
public class Property {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type;        // PG | Flat | Co-living
    private String location;
    private int price;
    private int deposit;
    private double rating = 0;
    private int reviewsCount = 0;
    private boolean verified = false;

    @Column(length = 1000)
    private String image;

    @Convert(converter = StringListConverter.class)
    @Column(length = 4000)
    private List<String> images = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(length = 1000)
    private List<String> amenities = new ArrayList<>();

    @Column(length = 2000)
    private String description;

    private Double latitude;             // map pin chosen by the owner
    private Double longitude;

    @Column(length = 500)
    private String address;              // full street address

    // ---- sharing rules (wrapper types: older rows have NULLs) ----
    private String genderPolicy = "CO_ED";                    // MALE_ONLY | FEMALE_ONLY | CO_ED
    private String foodPolicy = "NON_VEG_ALLOWED";            // VEG_ONLY | NON_VEG_ALLOWED
    private String tenantType = "BOTH";                       // STUDENTS | WORKING_PROFESSIONALS | BOTH
    private Boolean smokingAllowed = false;
    private Boolean drinkingAllowed = false;
    private Boolean petsAllowed = false;
    private Boolean visitorsAllowed = true;

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @OrderBy("occupancy ASC, pricePerBed ASC")
    private List<RoomOption> rooms = new ArrayList<>();

    private String status = "Under Review";   // Under Review | Active | Rejected
    private int bookingsCount = 0;

    @ManyToOne(optional = false)
    private User owner;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
