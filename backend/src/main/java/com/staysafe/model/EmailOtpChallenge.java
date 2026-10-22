package com.staysafe.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_otp_challenges", indexes = {
    @Index(name = "idx_otp_email_purpose", columnList = "email,purpose")
})
public class EmailOtpChallenge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false, length=320) private String email;
    @Column(nullable=false, length=40) private String purpose;
    @Column(nullable=false, length=64) private String otpHash;
    @Column(nullable=false) private LocalDateTime expiresAt;
    @Column(nullable=false) private int attempts = 0;
    @Column(nullable=false) private boolean consumed = false;
    @Column(nullable=false, length=36, unique=true) private String challengeId;
    @Column(nullable=false) private LocalDateTime createdAt = LocalDateTime.now();

    protected EmailOtpChallenge() {}
    public EmailOtpChallenge(String email, String purpose, String otpHash,
                             LocalDateTime expiresAt, String challengeId) {
        this.email=email; this.purpose=purpose; this.otpHash=otpHash;
        this.expiresAt=expiresAt; this.challengeId=challengeId;
    }
    public Long getId(){return id;}
    public String getEmail(){return email;}
    public String getPurpose(){return purpose;}
    public String getOtpHash(){return otpHash;}
    public LocalDateTime getExpiresAt(){return expiresAt;}
    public int getAttempts(){return attempts;}
    public boolean isConsumed(){return consumed;}
    public String getChallengeId(){return challengeId;}
    public void incrementAttempts(){attempts++;}
    public void consume(){consumed=true;}
}
