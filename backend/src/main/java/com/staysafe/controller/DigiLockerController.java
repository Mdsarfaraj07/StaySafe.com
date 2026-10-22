package com.staysafe.controller;

import com.staysafe.dto.Dtos.DigiLockerStartRequest;
import com.staysafe.model.User;
import com.staysafe.service.DigiLockerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/kyc/digilocker")
public class DigiLockerController {
    private final DigiLockerService service;

    public DigiLockerController(DigiLockerService service) {
        this.service = service;
    }

    @PostMapping("/start")
    public Map<String, String> start(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DigiLockerStartRequest request) {
        return Map.of("authorizationUrl",
                service.createAuthorizationUrl(user, Boolean.TRUE.equals(request.consent())));
    }

    /** DigiLocker redirects here after consent. OAuth state is validated and consumed server-side. */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {
        String destination = service.completeAuthorization(code, state, error);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, destination)
                .build();
    }
}
