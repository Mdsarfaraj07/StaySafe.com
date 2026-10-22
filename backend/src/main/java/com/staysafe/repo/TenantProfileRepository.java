package com.staysafe.repo;

import com.staysafe.model.TenantProfile;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TenantProfileRepository extends JpaRepository<TenantProfile, Long> {
    Optional<TenantProfile> findByUser(User user);
}
