package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Ticket {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;
    @ManyToOne(optional = false) private User user;
    private String subject;

    @Column(length = 2000) private String message;
    @Column(length = 2000) private String response;

    private String status = "Open";      // Open | Resolved
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
