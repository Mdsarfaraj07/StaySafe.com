package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.repo.WebhookEventRepository;
import com.staysafe.service.PaymentService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** Payments desk for admins (ROLE_ADMIN via /api/admin/**). */
@RestController
@RequestMapping("/api/admin")
public class AdminPaymentController {
    private final PaymentService payments;
    private final WebhookEventRepository events;

    public AdminPaymentController(PaymentService payments, WebhookEventRepository events) {
        this.payments = payments;
        this.events = events;
    }

    @GetMapping("/payments")
    public List<PaymentDto> list(@RequestParam(defaultValue = "ALL") String status) {
        return payments.adminList(status);
    }

    /** Full refund by default; pass {"amount": 500} (INR) for a partial refund. */
    @PostMapping("/payments/{id}/refund")
    public PaymentDto refund(@PathVariable Long id, @RequestBody(required = false) RefundRequest body) {
        return payments.adminRefund(id, body == null ? null : body.amount());
    }

    @GetMapping("/webhooks")
    public List<WebhookEventDto> webhookLog() {
        return events.findTop50ByOrderByReceivedAtDesc().stream().map(Mapper::webhook).toList();
    }
}
