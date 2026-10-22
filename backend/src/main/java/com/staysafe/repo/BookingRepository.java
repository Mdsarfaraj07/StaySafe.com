package com.staysafe.repo;

import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserOrderByCreatedAtDesc(User user);
    List<Booking> findByPropertyOwnerOrderByCreatedAtDesc(User owner);
    boolean existsByCode(String code);
    List<Booking> findByPropertyAndStatusOrderByCheckInAsc(Property property, String status);
    boolean existsByUserAndPropertyAndStatusNot(User user, Property property, String status);
}
