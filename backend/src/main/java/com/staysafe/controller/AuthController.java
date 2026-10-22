package com.staysafe.controller;

import com.staysafe.config.JwtService;
import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.UserRepository;
import com.staysafe.service.FileStorageService;
import com.staysafe.service.NotificationService;
import com.staysafe.service.EmailOtpService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final NotificationService notifications;
    private final FileStorageService files;
    private final EmailOtpService otpService;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt, NotificationService notifications,
                          FileStorageService files, EmailOtpService otpService) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.notifications = notifications;
        this.files = files;
        this.otpService = otpService;
    }

    @PostMapping("/register")
    public OtpChallengeResponse register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        otpService.ensureDeliveryConfigured();
        if (users.existsByEmail(email)) throw ApiException.conflict("Email is already registered");
        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(req.password()));
        u.setPhone(req.phone());
        u.setRole("OWNER".equalsIgnoreCase(req.role()) ? Role.OWNER : Role.CUSTOMER);
        u.setEmailVerified(false);
        users.save(u);
        var challenge = otpService.issue(email, "REGISTER", true);
        return new OtpChallengeResponse(challenge.challengeId(), challenge.email(),
                "A verification code was requested for your registered email. If it does not arrive, use resend.");
    }

    @PostMapping("/register/verify")
    public AuthResponse verifyRegistration(@Valid @RequestBody OtpVerifyRequest req) {
        String email = otpService.verify(req.challengeId(), req.otp(), "REGISTER");
        User u = users.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Registration could not be completed"));
        u.setEmailVerified(true);
        users.save(u);
        notifications.notify(u, "Welcome to StaySafe!",
                "Your email is verified. Explore verified PGs, rooms, and flats.", "system");
        return new AuthResponse(jwt.generate(u.getEmail(), u.getRole().name(), u.getTokenVersion()), Mapper.user(u));
    }

    @PostMapping("/login")
    public OtpChallengeResponse login(@Valid @RequestBody LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User u = users.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!encoder.matches(req.password(), u.getPassword()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        if (!u.isEnabled()) throw ApiException.forbidden("This account has been disabled");
        if (!u.isEmailVerified()) throw ApiException.forbidden("Verify your email before signing in");
        otpService.ensureDeliveryConfigured();
        var challenge = otpService.issue(email, "LOGIN", true);
        return new OtpChallengeResponse(challenge.challengeId(), challenge.email(),
                "A sign-in code was requested for your registered email. If it does not arrive, use resend.");
    }

    @PostMapping("/login/verify")
    public AuthResponse verifyLogin(@Valid @RequestBody OtpVerifyRequest req) {
        String email = otpService.verify(req.challengeId(), req.otp(), "LOGIN");
        User u = users.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid login"));
        if (!u.isEnabled() || !u.isEmailVerified())
            throw ApiException.forbidden("This account cannot sign in");
        return new AuthResponse(jwt.generate(u.getEmail(), u.getRole().name(), u.getTokenVersion()), Mapper.user(u));
    }

    @PostMapping("/password/forgot")
    public OtpChallengeResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        String email = req.email().trim().toLowerCase();
        boolean exists = users.existsByEmail(email);
        if (exists) otpService.ensureDeliveryConfigured();
        // Issue a non-delivered challenge for unknown addresses to avoid account enumeration.
        var challenge = otpService.issue(email, "RESET_PASSWORD", exists);
        return new OtpChallengeResponse(challenge.challengeId(), challenge.email(),
                "If the account exists, a password reset code has been sent to its registered email.");
    }

    @PostMapping("/otp/resend")
    public OtpChallengeResponse resendOtp(@Valid @RequestBody OtpResendRequest req) {
        var challenge = otpService.resend(req.challengeId(), email -> {
            User account = users.findByEmail(email).orElse(null);
            if (account == null) return false;
            return switch (challengePurpose(req.challengeId())) {
                case "REGISTER" -> !account.isEmailVerified();
                case "LOGIN" -> account.isEmailVerified() && account.isEnabled();
                case "RESET_PASSWORD" -> true;
                default -> false;
            };
        });
        return new OtpChallengeResponse(challenge.challengeId(), challenge.email(),
                "If eligible, a new code has been sent to your registered email.");
    }

    private String challengePurpose(String challengeId) {
        return otpService.purposeFor(challengeId);
    }

    @PostMapping("/password/reset")
    public org.springframework.http.ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        String email = otpService.verify(req.challengeId(), req.otp(), "RESET_PASSWORD");
        User u = users.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired reset code"));
        u.setPassword(encoder.encode(req.newPassword()));
        u.setTokenVersion(u.getTokenVersion() + 1); // revoke existing JWT sessions after password reset
        users.save(u);
        return org.springframework.http.ResponseEntity.ok(java.util.Map.of(
                "message", "Password reset successfully. Please sign in again."));
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal User user) {
        return Mapper.user(user);
    }

    /** Upload / replace the profile photo (multipart field "file"). */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserDto uploadAvatar(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        String url = files.store(file, "avatar");
        files.delete(user.getAvatarUrl());
        user.setAvatarUrl(url);
        return Mapper.user(users.save(user));
    }

    @DeleteMapping("/me/avatar")
    public UserDto removeAvatar(@AuthenticationPrincipal User user) {
        files.delete(user.getAvatarUrl());
        user.setAvatarUrl(null);
        return Mapper.user(users.save(user));
    }

    @PutMapping("/me")
    public UserDto update(@AuthenticationPrincipal User user, @RequestBody UpdateProfileRequest req) {
        if (req.name() != null && !req.name().isBlank()) user.setName(req.name().trim());
        if (req.phone() != null) user.setPhone(req.phone());
        return Mapper.user(users.save(user));
    }
}
