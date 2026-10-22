package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Role;
import com.staysafe.model.TenantProfile;
import com.staysafe.model.User;
import com.staysafe.repo.TenantProfileRepository;
import com.staysafe.service.SharingRules;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

/** A customer's roommate profile (gender, occupation, food, habits). Required before booking. */
@RestController
@RequestMapping("/api/profile/tenant")
public class TenantProfileController {
    private final TenantProfileRepository profiles;

    public TenantProfileController(TenantProfileRepository profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    public TenantProfileDto get(@AuthenticationPrincipal User user) {
        requireCustomer(user);
        return profiles.findByUser(user).map(Mapper::tenant)
                .orElse(new TenantProfileDto(null, null, null, null, null, null, false, false, null, null, null, true, false));
    }

    @PutMapping
    public TenantProfileDto save(@AuthenticationPrincipal User user, @RequestBody TenantProfileRequest r) {
        requireCustomer(user);
        if (r.dob() == null) throw ApiException.badRequest("Date of birth is required");
        if (r.dob().isAfter(LocalDate.now().minusYears(18))) throw ApiException.badRequest("You must be at least 18 years old");
        if (r.dob().isBefore(LocalDate.now().minusYears(100))) throw ApiException.badRequest("Enter a valid date of birth");

        TenantProfile t = profiles.findByUser(user).orElseGet(TenantProfile::new);
        t.setUser(user);
        t.setGender(SharingRules.require(r.gender(), SharingRules.GENDERS, "Gender"));
        t.setDob(r.dob());
        t.setOccupation(SharingRules.require(r.occupation(), SharingRules.OCCUPATIONS, "Occupation"));
        t.setFoodPreference(SharingRules.require(r.foodPreference(), SharingRules.FOODS, "Food preference"));
        t.setSleepSchedule(SharingRules.pick(r.sleepSchedule(), SharingRules.SLEEP, null, "sleep schedule"));
        t.setOrganization(clip(r.organization(), 120));
        t.setLanguages(clip(r.languages(), 200));
        t.setBio(clip(r.bio(), 500));
        t.setSmokes(r.smokes());
        t.setDrinks(r.drinks());
        t.setShareWithRoommates(!Boolean.FALSE.equals(r.shareWithRoommates()));
        return Mapper.tenant(profiles.save(t));
    }

    private static void requireCustomer(User u) {
        if (u.getRole() != Role.CUSTOMER) throw ApiException.forbidden("Only customers have a roommate profile");
    }

    private static String clip(String s, int max) {
        if (s == null || s.isBlank()) return null;
        String t = s.trim();
        return t.length() > max ? t.substring(0, max) : t;
    }
}
