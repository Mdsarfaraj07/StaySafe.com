package com.staysafe.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.staysafe.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

/** Thin wrapper over the Razorpay REST API (orders, payments, capture, refunds) + signature checks. */
@Component
public class RazorpayClient {
    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private volatile RestClient client;

    public RazorpayClient(@Value("${razorpay.key-id:}") String keyId,
                          @Value("${razorpay.key-secret:}") String keySecret,
                          @Value("${razorpay.webhook-secret:}") String webhookSecret,
                          @Value("${razorpay.api-base}") String baseUrl,
                          ObjectMapper mapper) {
        this.keyId = keyId;
        this.keySecret = keySecret;
        this.webhookSecret = webhookSecret;
        this.baseUrl = baseUrl;
        this.mapper = mapper;
    }

    public boolean configured() { return !keyId.isBlank() && !keySecret.isBlank(); }
    public boolean webhookConfigured() { return !webhookSecret.isBlank(); }
    public String keyId() { return keyId; }

    // ---------- API calls ----------
    public JsonNode createOrder(long amountPaise, String receipt, Map<String, String> notes) {
        return post("/orders", Map.of("amount", amountPaise, "currency", "INR", "receipt", receipt, "notes", notes));
    }

    public JsonNode fetchPayment(String paymentId) {
        try {
            return http().get().uri("/payments/{id}", paymentId).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw gatewayError(e);
        } catch (RestClientException e) {
            throw unreachable(e);
        }
    }

    public JsonNode capturePayment(String paymentId, long amountPaise) {
        return post("/payments/" + safe(paymentId) + "/capture", Map.of("amount", amountPaise, "currency", "INR"));
    }

    public JsonNode refund(String paymentId, long amountPaise, Map<String, String> notes) {
        return post("/payments/" + safe(paymentId) + "/refund", Map.of("amount", amountPaise, "speed", "normal", "notes", notes));
    }

    // ---------- signatures ----------
    /** Checkout success callback: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
    public boolean verifyCheckoutSignature(String orderId, String paymentId, String signature) {
        return constantTimeEquals(hmacHex((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8), keySecret), signature);
    }

    /** Webhook: HMAC_SHA256(raw request body, webhook_secret) sent in X-Razorpay-Signature. */
    public boolean verifyWebhookSignature(byte[] rawBody, String signature) {
        return constantTimeEquals(hmacHex(rawBody, webhookSecret), signature);
    }

    // ---------- internals ----------
    private JsonNode post(String path, Object body) {
        try {
            return http().post().uri(path).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
        } catch (RestClientResponseException e) {
            throw gatewayError(e);
        } catch (RestClientException e) {
            throw unreachable(e);
        }
    }

    private RestClient http() {
        if (!configured())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.");
        RestClient c = client;
        if (c == null) {
            c = RestClient.builder().baseUrl(baseUrl).defaultHeaders(h -> h.setBasicAuth(keyId, keySecret)).build();
            client = c;
        }
        return c;
    }

    private ApiException gatewayError(RestClientResponseException e) {
        String desc = "request failed (" + e.getStatusCode().value() + ")";
        try {
            JsonNode n = mapper.readTree(e.getResponseBodyAsString());
            String d = n.path("error").path("description").asText("");
            if (!d.isBlank()) desc = d;
        } catch (Exception ignored) {
            // keep generic description
        }
        return new ApiException(HttpStatus.BAD_GATEWAY, "Razorpay: " + desc);
    }

    private ApiException unreachable(RestClientException e) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "Could not reach Razorpay. Please try again.");
    }

    private static String safe(String id) {
        if (id == null || !id.matches("[A-Za-z0-9_]{5,40}")) throw ApiException.badRequest("Invalid Razorpay id");
        return id;
    }

    static String hmacHex(byte[] data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
