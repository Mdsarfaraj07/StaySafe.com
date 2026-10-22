package com.staysafe.repo;

import com.staysafe.model.Favorite;
import com.staysafe.model.Property;
import com.staysafe.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUser(User user);
    Optional<Favorite> findByUserAndProperty(User user, Property property);
}
