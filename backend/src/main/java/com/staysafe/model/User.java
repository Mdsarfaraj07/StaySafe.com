package com.staysafe.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @JsonIgnore
    private String password;

    private String phone;

    private String avatarUrl;          // /api/files/avatar-....jpg

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean enabled = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean emailVerified = true;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int tokenVersion = 0;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
