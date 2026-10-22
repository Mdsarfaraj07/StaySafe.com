package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.model.User;
import com.staysafe.service.PaymentService;
import com.staysafe.service.WebhookService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService payments;
    private final WebhookService webhooks;

    public PaymentController(PaymentService payments, WebhookService webhooks) {
        this.payments = payments;
        this.webhooks = webhooks;
    }

    /** Step 1: create a Razorpay order for a stay; the browser then opens Razorpay Checkout with it. */
    @PostMapping("/order")
    public OrderResponse order(@AuthenticationPrincipal User user, @Valid @RequestBody OrderRequest req) {
        return payments.createOrder(user, req);
    }

    /** Step 2: after Checkout succeeds - verify signature, capture and create the booking. */
    @PostMapping("/verify")
    public BookingDto verify(@AuthenticationPrincipal User user, @Valid @RequestBody VerifyRequest req) {
        return payments.verify(user, req);
    }

    @GetMapping("/me")
    public List<PaymentDto> mine(@AuthenticationPrincipal User user) {
        return payments.mine(user);
    }

    /**
     * Razorpay webhook endpoint (public, protected by the X-Razorpay-Signature HMAC).
     * The body is read as raw bytes because the signature is computed over the exact payload.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> webhook(
            @RequestBody byte[] body,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestHeader(value = "X-Razorpay-Event-Id", required = false) String eventId) {
        webhooks.handle(body, signature, eventId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
