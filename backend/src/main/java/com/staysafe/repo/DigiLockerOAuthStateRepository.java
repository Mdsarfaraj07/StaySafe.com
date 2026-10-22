package com.staysafe.repo;

import com.staysafe.model.DigiLockerOAuthState;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DigiLockerOAuthStateRepository
        extends JpaRepository<DigiLockerOAuthState, String> {}
