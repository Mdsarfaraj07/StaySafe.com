package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) private User user;
    private String title;

    @Column(length = 1000) private String message;

    private String type;                 // booking | payment | support | system | audit | payout
    private String refType;              // what the notification points to, e.g. "ticket"
    private Long refId;                  // id of that record
    private boolean unread = true;
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
