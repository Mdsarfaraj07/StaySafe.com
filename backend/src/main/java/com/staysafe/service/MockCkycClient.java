package com.staysafe.service;

import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

/** Development-only fake registry. Enable explicitly with the mock-ckyc profile; never use as real CKYC. */
@Component
@Profile("mock-ckyc")
public class MockCkycClient implements CkycClient {
    private static final Map<String, CkycData> REGISTRY = Map.of(
            "PAN:ABCDE1234F", new CkycData("50012345678901", "Rahul Verma", LocalDate.of(1988, 4, 12), "Male",
                    "12, 4th Cross, Koramangala, Bengaluru, Karnataka 560034"),
            "PAN:PQRSX5678L", new CkycData("50098765432109", "Anita Singh", LocalDate.of(1991, 9, 3), "Female",
                    "Sunrise Enclave, HSR Layout, Bengaluru, Karnataka 560102"),
            "AADHAAR:234567890124", new CkycData("50055566677788", "Suresh Nair", LocalDate.of(1985, 1, 22), "Male",
                    "44, 12th Main, Indiranagar, Bengaluru, Karnataka 560038"));

    @Override
    public Optional<CkycData> lookup(String idType, String id, LocalDate dob) {
        CkycData d = REGISTRY.get(idType + ":" + id);
        // DOB must match, otherwise treated as not found (do not reveal which part mismatched)
        return d != null && d.dob().equals(dob) ? Optional.of(d) : Optional.empty();
    }
}
