package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Log of every Razorpay webhook delivery (also used for idempotency via the unique event id). */
@Entity
@Table(name = "webhook_event")
@Getter @Setter @NoArgsConstructor
public class WebhookEvent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String eventId;                       // X-Razorpay-Event-Id

    private String eventType;                     // payment.captured, refund.processed ...

    @Column(columnDefinition = "LONGTEXT")
    private String payload;

    private String status = "RECEIVED";           // RECEIVED | PROCESSED | IGNORED | FAILED

    @Column(length = 500)
    private String error;

    private LocalDateTime receivedAt;
    private LocalDateTime processedAt;

    @PrePersist
    void onCreate() { receivedAt = LocalDateTime.now(); }
}
