package com.staysafe.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
@Table(name = "property_documents", indexes = @Index(name = "idx_property_doc_status", columnList = "status"))
public class PropertyDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) private Property property;
    @ManyToOne(optional = false) private User uploadedBy;
    @Column(nullable = false, length = 40) private String documentType;
    @Column(nullable = false, length = 180) private String originalFileName;
    @Column(nullable = false, unique = true, length = 120) private String storageName;
    @Column(nullable = false, length = 20) private String status = "PENDING_REVIEW";
    @Column(length = 1000) private String reviewRemarks;
    private LocalDateTime uploadedAt;
    private LocalDateTime reviewedAt;
    @PrePersist void onCreate() { uploadedAt = LocalDateTime.now(); }
}
