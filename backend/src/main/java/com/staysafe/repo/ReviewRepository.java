package com.staysafe.repo;

import com.staysafe.model.Property;
import com.staysafe.model.Review;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByPropertyOrderByCreatedAtDesc(Property property);
    boolean existsByPropertyAndUser(Property property, User user);
}
