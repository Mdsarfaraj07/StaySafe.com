package com.staysafe.service;

import com.staysafe.model.EmailOtpChallenge;
import com.staysafe.repo.EmailOtpChallengeRepository;
import com.staysafe.exception.ApiException;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class EmailOtpService {
    private static final Logger log = LoggerFactory.getLogger(EmailOtpService.class);
    private final EmailOtpChallengeRepository repo;
    private final EmailService email;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();
    public EmailOtpService(EmailOtpChallengeRepository repo, EmailService email, PasswordEncoder passwordEncoder) {
        this.repo=repo; this.email=email; this.passwordEncoder=passwordEncoder;
    }
    public record Issued(String challengeId, String email) {}
    public void ensureDeliveryConfigured() {
        if (!email.isEnabled()) {
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured. Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD and MAIL_ENABLED=true.");
        }
    }
    @Transactional
    public Issued issue(String address, String purpose, boolean deliver) {
        String otp = String.format("%06d", random.nextInt(1_000_000));
        String challengeId = UUID.randomUUID().toString();
        EmailOtpChallenge c = new EmailOtpChallenge(address, purpose, passwordEncoder.encode(otp),
                LocalDateTime.now().plusMinutes(10), challengeId);
        repo.save(c);
        if (deliver) {
            try {
                email.sendOtp(address, otp, purpose);
            } catch (Exception ex) {
                // Keep the challenge so the user can request a resend after SMTP is fixed.
                log.error("OTP email delivery failed for {}", mask(address), ex);
            }
        }
        return new Issued(challengeId, mask(address));
    }
    @Transactional
    public Issued resend(String previousChallengeId, java.util.function.Predicate<String> canSend) {
        EmailOtpChallenge old = repo.findByChallengeId(previousChallengeId)
            .orElseThrow(() -> new IllegalArgumentException("Verification request expired"));
        if (!canSend.test(old.getEmail())) {
            // Return a generic challenge identifier but never send to an unverified/nonexistent account.
            return issue(old.getEmail(), old.getPurpose(), false);
        }
        ensureDeliveryConfigured();
        return issue(old.getEmail(), old.getPurpose(), true);
    }

    @Transactional(readOnly = true)
    public String purposeFor(String challengeId) {
        return repo.findByChallengeId(challengeId)
            .map(EmailOtpChallenge::getPurpose)
            .orElseThrow(() -> new IllegalArgumentException("Verification request expired"));
    }
    @Transactional(noRollbackFor = ApiException.class)
    public String verify(String challengeId, String otp, String purpose) {
        EmailOtpChallenge c = repo.findByChallengeId(challengeId)
            .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification code"));
        if (!purpose.equals(c.getPurpose()) || c.isConsumed()
                || c.getExpiresAt().isBefore(LocalDateTime.now()) || c.getAttempts() >= 5) {
            throw ApiException.badRequest("Invalid or expired verification code");
        }
        c.incrementAttempts();
        if (!passwordEncoder.matches(otp, c.getOtpHash())) {
            repo.save(c);
            throw ApiException.badRequest("Invalid or expired verification code");
        }
        c.consume();
        repo.save(c);
        return c.getEmail();
    }
    private String mask(String email) {
        int at=email.indexOf('@');
        if(at < 1) return "***";
        String local=email.substring(0,at);
        return local.charAt(0) + "***@" + email.substring(at+1);
    }
}
