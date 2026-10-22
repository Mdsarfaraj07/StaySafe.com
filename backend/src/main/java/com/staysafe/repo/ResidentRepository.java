package com.staysafe.repo;

import com.staysafe.model.Property;
import com.staysafe.model.Resident;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ResidentRepository extends JpaRepository<Resident, Long> {
    List<Resident> findByPropertyOrderByIdAsc(Property property);
}
