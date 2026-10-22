package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/** Current resident / flatmate entered by the owner. Shown to prospective tenants only with the resident's consent. */
@Entity
@Getter @Setter @NoArgsConstructor
public class Resident {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) private Property property;
    @ManyToOne private RoomOption roomOption;

    private String name;
    private String gender;            // MALE | FEMALE | OTHER
    private int age;
    private String occupation;        // STUDENT | WORKING_PROFESSIONAL | OTHER
    private String organization;      // college / company
    private String foodPreference;    // VEG | EGGETARIAN | NON_VEG
    private boolean smokes;
    private boolean drinks;
    private String sleepSchedule;     // EARLY_BIRD | NIGHT_OWL | FLEXIBLE

    @Column(length = 500)
    private String bio;

    private LocalDate moveInDate;
    private boolean consent;          // resident agreed to share these details
}
