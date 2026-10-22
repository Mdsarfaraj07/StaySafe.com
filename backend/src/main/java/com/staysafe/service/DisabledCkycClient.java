package com.staysafe.service;

import com.staysafe.exception.ApiException;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

/** Prevents the former demo registry from being mistaken for a real CKYC integration. */
@Component
@Profile("!mock-ckyc")
public class DisabledCkycClient implements CkycClient {
    @Override
    public Optional<CkycData> lookup(String idType, String id, LocalDate dob) {
        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                "Direct CKYC lookup is not configured. Use the authorized DigiLocker flow or configure an eligible CKYC provider.");
    }
}
