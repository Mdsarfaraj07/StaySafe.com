package com.staysafe.service;

import com.staysafe.dto.Dtos.RoommateDto;
import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.Resident;
import com.staysafe.model.TenantProfile;
import com.staysafe.model.User;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.ResidentRepository;
import com.staysafe.repo.TenantProfileRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Roommates visible to a prospective tenant: residents the owner added (with the resident's consent)
 * plus StaySafe members with an active / upcoming booking who chose to share their profile.
 * Only first name + last initial and lifestyle basics are exposed - never phone, email or exact age.
 */
@Service
public class RoommateService {
    private final ResidentRepository residents;
    private final BookingRepository bookings;
    private final TenantProfileRepository profiles;

    public RoommateService(ResidentRepository residents, BookingRepository bookings, TenantProfileRepository profiles) {
        this.residents = residents;
        this.bookings = bookings;
        this.profiles = profiles;
    }

    public List<RoommateDto> forProperty(Property p, User viewer) {
        List<RoommateDto> out = new ArrayList<>();

        for (Resident r : residents.findByPropertyOrderByIdAsc(p)) {
            if (!r.isConsent()) continue;
            out.add(new RoommateDto("OWNER", masked(r.getName()), r.getGender(), SharingRules.ageGroup(r.getAge()),
                    r.getOccupation(), r.getOrganization(), r.getFoodPreference(), r.isSmokes(), r.isDrinks(),
                    r.getSleepSchedule(), null, r.getBio(),
                    r.getRoomOption() == null ? null : r.getRoomOption().getLabel(), r.getMoveInDate(), null));
        }

        LocalDate today = LocalDate.now();
        for (Booking b : bookings.findByPropertyAndStatusOrderByCheckInAsc(p, "Confirmed")) {
            if (b.getCheckOut().isBefore(today)) continue;
            if (viewer != null && b.getUser().getId().equals(viewer.getId())) continue;
            TenantProfile t = profiles.findByUser(b.getUser()).orElse(null);
            if (t == null || !t.isShareWithRoommates() || !EligibilityService.isComplete(t)) continue;
            out.add(new RoommateDto("MEMBER", masked(b.getUser().getName()), t.getGender(),
                    SharingRules.ageGroup(SharingRules.age(t.getDob())), t.getOccupation(), t.getOrganization(),
                    t.getFoodPreference(), t.isSmokes(), t.isDrinks(), t.getSleepSchedule(), t.getLanguages(), t.getBio(),
                    b.getRoomOption() == null ? null : b.getRoomOption().getLabel(), b.getCheckIn(), b.getUser().getAvatarUrl()));
        }
        return out;
    }

    /** "Priya Sharma" -> "Priya S." */
    static String masked(String name) {
        if (name == null || name.isBlank()) return "Resident";
        String[] parts = name.trim().split("\\s+");
        return parts.length == 1 ? parts[0] : parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
