package com.staysafe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.staysafe.exception.ApiException;
import com.staysafe.model.DigiLockerOAuthState;
import com.staysafe.model.KycRecord;
import com.staysafe.model.User;
import com.staysafe.repo.DigiLockerOAuthStateRepository;
import com.staysafe.repo.KycRepository;
import com.staysafe.repo.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class DigiLockerService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final DigiLockerOAuthStateRepository states;
    private final UserRepository users;
    private final KycRepository kycRecords;
    private final NotificationService notifications;
    private final RestClient http;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String authorizeUri;
    private final String tokenUri;
    private final String userUri;
    private final String issuedDocumentsUri;
    private final String frontendUrl;
    private final String hashSecret;

    public DigiLockerService(
            DigiLockerOAuthStateRepository states,
            UserRepository users,
            KycRepository kycRecords,
            NotificationService notifications,
            RestClient.Builder restClientBuilder,
            @Value("${digilocker.client-id:}") String clientId,
            @Value("${digilocker.client-secret:}") String clientSecret,
            @Value("${digilocker.redirect-uri:http://localhost:8080/api/kyc/digilocker/callback}") String redirectUri,
            @Value("${digilocker.authorize-uri:https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize}") String authorizeUri,
            @Value("${digilocker.token-uri:https://digilocker.meripehchaan.gov.in/public/oauth2/1/token}") String tokenUri,
            @Value("${digilocker.user-uri:https://digilocker.meripehchaan.gov.in/public/oauth2/1/user}") String userUri,
            @Value("${digilocker.issued-documents-uri:https://digilocker.meripehchaan.gov.in/public/oauth2/2/files/issued}") String issuedDocumentsUri,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl,
            @Value("${app.kyc.hash-secret}") String hashSecret) {
        this.states = states;
        this.users = users;
        this.kycRecords = kycRecords;
        this.notifications = notifications;
        this.http = restClientBuilder.build();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.authorizeUri = authorizeUri;
        this.tokenUri = tokenUri;
        this.userUri = userUri;
        this.issuedDocumentsUri = issuedDocumentsUri;
        this.frontendUrl = frontendUrl;
        this.hashSecret = hashSecret;
    }

    public String createAuthorizationUrl(User user, boolean consent) {
        if (!consent) {
            throw ApiException.badRequest("Consent is required before continuing to DigiLocker");
        }
        requireCredentials();
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String state = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now();
        states.save(new DigiLockerOAuthState(
                state, user.getId(), now, now.plusSeconds(600), "STAYSAFE-DIGILOCKER-CONSENT-v1"));

        return UriComponentsBuilder.fromUriString(authorizeUri)
                .queryParam("response_type", "code")
                .queryParam("client_id", clientId)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("state", state)
                .build().encode().toUriString();
    }

    public String completeAuthorization(String code, String state, String providerError) {
        String redirect = frontendUrl + "/?kyc=digilocker-error";
        try {
            if (state == null || state.isBlank()) return redirect;
            DigiLockerOAuthState oauthState = states.findById(state).orElse(null);
            if (oauthState == null || oauthState.getConsumedAt() != null
                    || oauthState.getExpiresAt().isBefore(Instant.now())) return redirect;

            // Consume state before making outbound calls, preventing replay of the callback.
            oauthState.consume(Instant.now());
            states.saveAndFlush(oauthState);

            if (providerError != null || code == null || code.isBlank()) return redirect;

            User user = users.findById(oauthState.getUserId()).orElse(null);
            if (user == null || !user.isEnabled()) return redirect;

            JsonNode token = exchangeCode(code);
            String accessToken = token.path("access_token").asText("");
            if (accessToken.isBlank()) return redirect;

            JsonNode profile = getJson(userUri, accessToken);
            // Query the authorized account's issued-document metadata in this session.
            // Document content is not persisted by this callback.
            JsonNode docs = getJson(issuedDocumentsUri, accessToken);
            int documentCount = countDocuments(docs);

            String digilockerId = profile.path("digilockerid").asText("");
            String name = profile.path("name").asText(user.getName());
            LocalDate dob = parseDob(profile.path("dob").asText(""));
            if (digilockerId.isBlank()) {
                // Some authorized deployments may omit this field. Do not use a bearer token as identity.
                return redirect;
            }

            persistPendingKyc(user, digilockerId, name, dob, documentCount);
            return frontendUrl + "/?kyc=digilocker-pending";
        } catch (RuntimeException ex) {
            // Do not expose provider errors, codes, tokens or identity data in the redirect URL.
            return redirect;
        }
    }

    @Transactional
    protected void persistPendingKyc(User user, String digilockerId,
                                     String name, LocalDate dob, int documentCount) {
        String hash = hash("DIGILOCKER", digilockerId);
        Optional<KycRecord> existing = kycRecords.findByUser(user);
        KycRecord record = existing.orElseGet(KycRecord::new);

        if ("VERIFIED".equals(record.getStatus())) return;

        record.setUser(user);
        record.setSource("DIGILOCKER");
        // OAuth identity + document availability is not, by itself, a completed CKYC lookup.
        // Keep the record pending until a permitted document/identity check is completed.
        record.setStatus("PENDING_REVIEW");
        record.setIdType("DIGILOCKER");
        record.setIdMasked("DigiLocker account");
        record.setIdHash(hash);
        record.setCkycNumber(null);
        record.setFullName(name == null || name.isBlank() ? user.getName() : name);
        record.setDob(dob);
        record.setAddress(null);
        record.setRemarks("DigiLocker consent completed. " + documentCount
                + " issued-document item(s) were listed; document authenticity and applicable KYC checks remain pending.");
        record.setSubmittedAt(LocalDateTime.now());
        record.setReviewedAt(null);
        kycRecords.save(record);
        notifications.notify(user, "DigiLocker connected",
                "DigiLocker authorization completed. Your KYC is pending document and eligibility review.",
                "system");
    }

    private JsonNode exchangeCode(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("redirect_uri", redirectUri);
        return http.post().uri(tokenUri)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(JsonNode.class);
    }

    private JsonNode getJson(String uri, String accessToken) {
        return http.get().uri(uri)
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve().body(JsonNode.class);
    }

    private int countDocuments(JsonNode root) {
        if (root == null || root.isMissingNode() || root.isNull()) return 0;
        for (String key : new String[]{"items", "documents", "files", "issued_documents"}) {
            JsonNode arr = root.path(key);
            if (arr.isArray()) return arr.size();
        }
        JsonNode nested = root.path("data");
        if (nested.isObject()) return countDocuments(nested);
        return 0;
    }

    private LocalDate parseDob(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            if (raw.matches("\\d{8}")) {
                return LocalDate.parse(raw, DateTimeFormatter.ofPattern("ddMMyyyy"));
            }
            return LocalDate.parse(raw.substring(0, 10));
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private void requireCredentials() {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            throw ApiException.badRequest(
                "DigiLocker is not configured. Add approved requester credentials to the backend environment.");
        }
    }

    private String hash(String type, String id) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((type + ":" + id).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
