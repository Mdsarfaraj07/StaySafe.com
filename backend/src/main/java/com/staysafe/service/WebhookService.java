package com.staysafe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.WebhookEvent;
import com.staysafe.repo.WebhookEventRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * Receives Razorpay webhooks: verifies the signature over the RAW body, de-duplicates by event id,
 * logs every delivery, and hands the event to PaymentService (own transaction).
 * Not @Transactional on purpose: the event log must survive a failed dispatch.
 */
@Service
public class WebhookService {
    private final RazorpayClient razorpay;
    private final PaymentService payments;
    private final WebhookEventRepository events;
    private final ObjectMapper mapper;

    public WebhookService(RazorpayClient razorpay, PaymentService payments, WebhookEventRepository events, ObjectMapper mapper) {
        this.razorpay = razorpay;
        this.payments = payments;
        this.events = events;
        this.mapper = mapper;
    }

    public void handle(byte[] raw, String signature, String eventIdHeader) {
        if (!razorpay.webhookConfigured())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Webhook secret is not configured");
        if (signature == null || !razorpay.verifyWebhookSignature(raw, signature))
            throw ApiException.badRequest("Invalid webhook signature");

        JsonNode root;
        try {
            root = mapper.readTree(raw);
        } catch (IOException e) {
            throw ApiException.badRequest("Malformed webhook payload");
        }
        String event = root.path("event").asText("unknown");
        String eventId = (eventIdHeader != null && !eventIdHeader.isBlank()) ? eventIdHeader : sha256(raw);

        WebhookEvent we = events.findByEventId(eventId).orElse(null);
        if (we != null && ("PROCESSED".equals(we.getStatus()) || "IGNORED".equals(we.getStatus()))) return;   // duplicate delivery
        if (we == null) {
            we = new WebhookEvent();
            we.setEventId(eventId);
            we.setEventType(event);
            we.setPayload(new String(raw, StandardCharsets.UTF_8));
            try {
                we = events.saveAndFlush(we);
            } catch (DataIntegrityViolationException duplicate) {
                return;                                    // the same event is being handled by another request
            }
        }

        try {
            we.setStatus(payments.dispatch(event, root));
            we.setError(null);
        } catch (RuntimeException ex) {
            we.setStatus("FAILED");
            String m = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
            we.setError(m.length() > 450 ? m.substring(0, 450) : m);
            events.save(we);
            throw ex;                                      // non-2xx => Razorpay retries the delivery
        }
        we.setProcessedAt(LocalDateTime.now());
        events.save(we);
    }

    private static String sha256(byte[] data) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
