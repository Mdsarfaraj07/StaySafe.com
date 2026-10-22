package com.staysafe.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
@Table(name = "chat_messages", indexes = {
    @Index(name = "idx_chat_user_created", columnList = "conversation_user_id, created_at")
})
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "conversation_user_id", nullable = false)
    private User conversationUser;
    @ManyToOne(optional = false) private User sender;
    @Column(nullable = false, length = 2000) private String message;
    @Column(nullable = false) private boolean fromSupport;
    @Column(nullable = false) private LocalDateTime createdAt;
    private LocalDateTime readAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
