package com.staysafe.repo;

import com.staysafe.model.Property;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByStatusOrderByIdAsc(String status);
    List<Property> findByOwnerOrderByIdDesc(User owner);
}
