package com.staysafe.repo;

import com.staysafe.model.RoomOption;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;

public interface RoomOptionRepository extends JpaRepository<RoomOption, Long> {
    /** Row lock used when a bed is taken / released so two payments can never grab the last bed. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RoomOption> findWithLockById(Long id);
}
