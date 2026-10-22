package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/** A customer's roommate profile: used for eligibility (gender / food / occupation rules) and roommate matching. */
@Entity
@Getter @Setter @NoArgsConstructor
public class TenantProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(unique = true)
    private User user;

    private String gender;
    private LocalDate dob;
    private String occupation;
    private String organization;
    private String foodPreference;
    private boolean smokes;
    private boolean drinks;
    private String sleepSchedule;
    private String languages;

    @Column(length = 500)
    private String bio;

    private boolean shareWithRoommates = true;
}
