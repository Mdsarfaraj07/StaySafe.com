package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Owner KYC. Full government ID numbers are NEVER stored: only a masked value (for display)
 * and an HMAC hash (for duplicate detection).
 */
@Entity
@Table(name = "kyc_record")
@Getter @Setter @NoArgsConstructor
public class KycRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(unique = true)
    private User user;

    private String source;               // CKYC | MANUAL | DIGILOCKER
    private String status;               // VERIFIED | PENDING_REVIEW | REJECTED
    private String idType;               // PAN | AADHAAR | PASSPORT | VOTER_ID | DRIVING_LICENSE
    private String idMasked;

    @Column(name = "id_hash", nullable = false, unique = true, length = 64)
    private String idHash;

    private String ckycNumber;           // 14-digit CKYC identifier when found in the registry
    private String fullName;
    private LocalDate dob;

    @Column(length = 500)
    private String address;

    @Column(length = 500)
    private String remarks;

    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
}
