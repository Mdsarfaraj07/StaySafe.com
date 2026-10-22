package com.staysafe.repo;

import com.staysafe.model.KycRecord;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface KycRepository extends JpaRepository<KycRecord, Long> {
    Optional<KycRecord> findByUser(User user);
    Optional<KycRecord> findByIdHash(String idHash);
    List<KycRecord> findAllByOrderBySubmittedAtDesc();
    List<KycRecord> findByStatusOrderBySubmittedAtDesc(String status);
}
