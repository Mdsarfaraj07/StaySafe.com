package com.staysafe.service;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.KycRecord;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.KycRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class KycService {
    private static final int MAX_LOOKUPS = 10;                 // per user, per window
    private static final long WINDOW_SECONDS = 15 * 60;

    private final KycRepository repo;
    private final CkycClient ckyc;
    private final NotificationService notifications;
    private final String secret;
    private final Map<Long, Deque<Instant>> lookupLog = new ConcurrentHashMap<>();

    public KycService(KycRepository repo, CkycClient ckyc, NotificationService notifications,
                      @Value("${app.kyc.hash-secret}") String secret) {
        this.repo = repo;
        this.ckyc = ckyc;
        this.notifications = notifications;
        this.secret = secret;
    }

    // ---------- queries ----------
    public KycDto status(User u) {
        return repo.findByUser(u).map(Mapper::kyc).orElseGet(() ->
                new KycDto(null, "NOT_SUBMITTED", null, null, null, null, null, null, null, null, null,
                        u.getId(), u.getName(), u.getEmail()));
    }

    /** Owners may submit listings once KYC is verified or waiting for admin review. */
    public boolean canList(User u) {
        return repo.findByUser(u).map(k -> "VERIFIED".equals(k.getStatus()) || "PENDING_REVIEW".equals(k.getStatus())).orElse(false);
    }

    public boolean isVerified(User u) {
        return repo.findByUser(u).map(k -> "VERIFIED".equals(k.getStatus())).orElse(false);
    }

    public List<KycDto> list(String status) {
        List<KycRecord> rows = (status == null || status.isBlank() || status.equalsIgnoreCase("ALL"))
                ? repo.findAllByOrderBySubmittedAtDesc()
                : repo.findByStatusOrderBySubmittedAtDesc(status.toUpperCase());
        return rows.stream().map(Mapper::kyc).toList();
    }

    // ---------- owner flow ----------
    public CkycLookupResponse lookup(User u, CkycLookupRequest req) {
        requireConsent(req.consent());
        throttle(u);
        String type = IdValidator.normalizeType(req.idType());
        String id = IdValidator.normalize(type, req.idNumber());
        String masked = IdValidator.mask(type, id);
        return ckyc.lookup(type, id, req.dob())
                .map(d -> new CkycLookupResponse(true, d.ckycNumber(), d.fullName(), d.dob(), d.gender(), d.address(),
                        masked, "CKYC record found"))
                .orElseGet(() -> new CkycLookupResponse(false, null, null, null, null, null, masked,
                        "No CKYC record found for these details. You can enter your government ID details manually."));
    }

    @Transactional
    public KycDto confirm(User u, CkycLookupRequest req) {
        requireConsent(req.consent());
        throttle(u);
        String type = IdValidator.normalizeType(req.idType());
        String id = IdValidator.normalize(type, req.idNumber());
        // re-run the lookup server-side: never trust record data sent by the browser
        CkycClient.CkycData d = ckyc.lookup(type, id, req.dob())
                .orElseThrow(() -> ApiException.notFound("No CKYC record found for these details"));

        KycRecord k = prepare(u, type, id);
        k.setSource("CKYC");
        k.setStatus("VERIFIED");
        k.setCkycNumber(d.ckycNumber());
        k.setFullName(d.fullName());
        k.setDob(d.dob());
        k.setAddress(d.address());
        k.setRemarks("Matched in Central KYC Registry");
        k.setReviewedAt(LocalDateTime.now());
        repo.save(k);

        notifications.notify(u, "KYC Verified", "Your identity was verified through CKYC (" + k.getIdMasked() + "). You can now list properties.", "system");
        return Mapper.kyc(k);
    }

    @Transactional
    public KycDto manual(User u, ManualKycRequest req) {
        requireConsent(req.consent());
        String type = IdValidator.normalizeType(req.idType());
        String id = IdValidator.normalize(type, req.idNumber());
        if (req.dob().isAfter(LocalDate.now().minusYears(18))) throw ApiException.badRequest("Owner must be at least 18 years old");
        if (req.fullName().trim().length() < 3) throw ApiException.badRequest("Enter your full name as on the ID");

        KycRecord k = prepare(u, type, id);
        k.setSource("MANUAL");
        k.setStatus("PENDING_REVIEW");
        k.setCkycNumber(null);
        k.setFullName(req.fullName().trim());
        k.setDob(req.dob());
        k.setAddress(req.address().trim());
        k.setRemarks(null);
        repo.save(k);

        notifications.notifyRole(Role.ADMIN, "New KYC Review Request",
                u.getName() + " submitted " + type + " (" + k.getIdMasked() + ") for manual KYC verification.", "audit");
        notifications.notify(u, "KYC Submitted", "Your " + type + " details are with our team for review.", "system");
        return Mapper.kyc(k);
    }

    // ---------- admin flow ----------
    @Transactional
    public KycDto review(Long id, boolean approve, String remarks) {
        KycRecord k = repo.findById(id).orElseThrow(() -> ApiException.notFound("KYC record not found"));
        if (!"PENDING_REVIEW".equals(k.getStatus())) throw ApiException.badRequest("Only pending KYC submissions can be reviewed");
        k.setStatus(approve ? "VERIFIED" : "REJECTED");
        k.setRemarks(approve ? "Approved by admin" : (remarks == null || remarks.isBlank() ? "Rejected by admin" : remarks.trim()));
        k.setReviewedAt(LocalDateTime.now());
        repo.save(k);

        if (approve) notifications.notify(k.getUser(), "KYC Approved", "Your identity is verified. You can now list properties.", "system");
        else notifications.notify(k.getUser(), "KYC Rejected", k.getRemarks() + " Please resubmit your details.", "audit");
        return Mapper.kyc(k);
    }

    /** Used by the demo data seeder. */
    public void seedVerified(User u, String type, String idNumber, String name, String source, String ckycNo,
                             LocalDate dob, String address) {
        KycRecord k = new KycRecord();
        k.setUser(u);
        k.setIdType(type);
        k.setIdMasked(IdValidator.mask(type, idNumber));
        k.setIdHash(hash(type, idNumber));
        k.setSource(source);
        k.setStatus("VERIFIED");
        k.setCkycNumber(ckycNo);
        k.setFullName(name);
        k.setDob(dob);
        k.setAddress(address);
        k.setRemarks("Seeded demo record");
        k.setSubmittedAt(LocalDateTime.now());
        k.setReviewedAt(LocalDateTime.now());
        repo.save(k);
    }

    // ---------- helpers ----------
    private KycRecord prepare(User u, String type, String id) {
        String h = hash(type, id);
        repo.findByIdHash(h).ifPresent(other -> {
            if (!other.getUser().getId().equals(u.getId()))
                throw ApiException.conflict("This government ID is already registered with another account");
        });
        KycRecord k = repo.findByUser(u).orElseGet(KycRecord::new);
        if ("VERIFIED".equals(k.getStatus())) throw ApiException.conflict("Your KYC is already verified");
        k.setUser(u);
        k.setIdType(type);
        k.setIdMasked(IdValidator.mask(type, id));
        k.setIdHash(h);
        k.setSubmittedAt(LocalDateTime.now());
        k.setReviewedAt(null);
        return k;
    }

    private static void requireConsent(boolean consent) {
        if (!consent) throw ApiException.badRequest("Your consent is required to verify your identity");
    }

    /** Basic brute-force protection for registry lookups. */
    private void throttle(User u) {
        Deque<Instant> log = lookupLog.computeIfAbsent(u.getId(), k -> new ArrayDeque<>());
        synchronized (log) {
            Instant cutoff = Instant.now().minusSeconds(WINDOW_SECONDS);
            while (!log.isEmpty() && log.peekFirst().isBefore(cutoff)) log.pollFirst();
            if (log.size() >= MAX_LOOKUPS)
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many KYC lookups. Please try again in a few minutes.");
            log.addLast(Instant.now());
        }
    }

    private String hash(String type, String id) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((type + ":" + id).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
