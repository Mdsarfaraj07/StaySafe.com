package com.staysafe.service;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Abstraction over the Central KYC Registry (CERSAI).
 * The real registry is only available to regulated entities via CERSAI or a licensed KYC provider,
 * so this project ships a MockCkycClient. Provide another @Component implementing this interface
 * (and remove @Component from the mock) to go live.
 */
public interface CkycClient {
    record CkycData(String ckycNumber, String fullName, LocalDate dob, String gender, String address) {}

    /** @param idType PAN | AADHAAR | ...   @param id normalised ID number   @param dob date of birth used to verify the match */
    Optional<CkycData> lookup(String idType, String id, LocalDate dob);
}
