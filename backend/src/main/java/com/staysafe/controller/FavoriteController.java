package com.staysafe.controller;

import com.staysafe.exception.ApiException;
import com.staysafe.model.Favorite;
import com.staysafe.model.Property;
import com.staysafe.model.User;
import com.staysafe.repo.FavoriteRepository;
import com.staysafe.repo.PropertyRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteRepository favorites;
    private final PropertyRepository properties;

    public FavoriteController(FavoriteRepository favorites, PropertyRepository properties) {
        this.favorites = favorites;
        this.properties = properties;
    }

    @GetMapping
    public List<Long> mine(@AuthenticationPrincipal User user) {
        return favorites.findByUser(user).stream().map(f -> f.getProperty().getId()).toList();
    }

    /** Toggle favorite on/off. */
    @PostMapping("/{propertyId}")
    public Map<String, Object> toggle(@PathVariable Long propertyId, @AuthenticationPrincipal User user) {
        Property p = properties.findById(propertyId).orElseThrow(() -> ApiException.notFound("Property not found"));
        var existing = favorites.findByUserAndProperty(user, p);
        boolean favorited;
        if (existing.isPresent()) {
            favorites.delete(existing.get());
            favorited = false;
        } else {
            Favorite f = new Favorite();
            f.setUser(user);
            f.setProperty(p);
            favorites.save(f);
            favorited = true;
        }
        return Map.of("favorited", favorited, "ids", mine(user));
    }
}
