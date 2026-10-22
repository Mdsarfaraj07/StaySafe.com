package com.staysafe.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "digilocker_oauth_state")
public class DigiLockerOAuthState {
    @Id
    @Column(length = 100)
    private String state;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant consumedAt;

    @Version
    private Long version;

    @Column(nullable = false, length = 30)
    private String consentVersion;

    protected DigiLockerOAuthState() {}

    public DigiLockerOAuthState(String state, Long userId, Instant now,
                                Instant expiresAt, String consentVersion) {
        this.state = state;
        this.userId = userId;
        this.createdAt = now;
        this.expiresAt = expiresAt;
        this.consentVersion = consentVersion;
    }

    public String getState() { return state; }
    public Long getUserId() { return userId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getConsumedAt() { return consumedAt; }
    public String getConsentVersion() { return consentVersion; }
    public void consume(Instant now) { this.consumedAt = now; }
}
