package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.model.User;
import com.staysafe.service.KycService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Owner KYC onboarding. All endpoints require ROLE_OWNER (see SecurityConfig). */
@RestController
@RequestMapping("/api/kyc")
public class KycController {
    private final KycService kyc;

    public KycController(KycService kyc) {
        this.kyc = kyc;
    }

    @GetMapping("/me")
    public KycDto me(@AuthenticationPrincipal User owner) {
        return kyc.status(owner);
    }

    /** Step 1: search the CKYC registry by ID number + date of birth (requires explicit consent). */
    @PostMapping("/ckyc-lookup")
    public CkycLookupResponse lookup(@AuthenticationPrincipal User owner, @Valid @RequestBody CkycLookupRequest req) {
        return kyc.lookup(owner, req);
    }

    /** Step 2a: owner confirms the CKYC record found -> verified instantly. */
    @PostMapping("/ckyc-confirm")
    public KycDto confirm(@AuthenticationPrincipal User owner, @Valid @RequestBody CkycLookupRequest req) {
        return kyc.confirm(owner, req);
    }

    /** Step 2b: not found in CKYC -> owner enters government ID details manually (goes to admin review). */
    @PostMapping("/manual")
    public KycDto manual(@AuthenticationPrincipal User owner, @Valid @RequestBody ManualKycRequest req) {
        return kyc.manual(owner, req);
    }
}
