package com.staysafe.service;

import com.staysafe.model.Property;
import com.staysafe.model.Role;
import com.staysafe.model.TenantProfile;
import com.staysafe.model.User;
import com.staysafe.repo.TenantProfileRepository;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

/** Checks a customer's roommate profile against the property's gender / food / occupation / lifestyle rules. */
@Service
public class EligibilityService {
    private final TenantProfileRepository profiles;

    public EligibilityService(TenantProfileRepository profiles) {
        this.profiles = profiles;
    }

    public static boolean isComplete(TenantProfile t) {
        return t != null && t.getDob() != null && notBlank(t.getGender()) && notBlank(t.getOccupation()) && notBlank(t.getFoodPreference());
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }

    /** Empty list = eligible. */
    public List<String> problems(User user, Property p) {
        List<String> out = new ArrayList<>();
        if (user.getRole() != Role.CUSTOMER) {
            out.add("Only customers can book stays.");
            return out;
        }
        TenantProfile t = profiles.findByUser(user).orElse(null);
        if (!isComplete(t)) {
            out.add("Complete your roommate profile (gender, date of birth, occupation and food preference) to book.");
            return out;
        }
        if (SharingRules.age(t.getDob()) < 18) out.add("You must be at least 18 years old to book.");

        String gp = SharingRules.orDefault(p.getGenderPolicy(), "CO_ED");
        if ("MALE_ONLY".equals(gp) && !"MALE".equals(t.getGender())) out.add("This property is for men only.");
        if ("FEMALE_ONLY".equals(gp) && !"FEMALE".equals(t.getGender())) out.add("This property is for women only.");

        String tt = SharingRules.orDefault(p.getTenantType(), "BOTH");
        if ("STUDENTS".equals(tt) && !"STUDENT".equals(t.getOccupation())) out.add("This property is for students only.");
        if ("WORKING_PROFESSIONALS".equals(tt) && !"WORKING_PROFESSIONAL".equals(t.getOccupation()))
            out.add("This property is for working professionals only.");

        if ("VEG_ONLY".equals(SharingRules.orDefault(p.getFoodPolicy(), "NON_VEG_ALLOWED")) && !"VEG".equals(t.getFoodPreference()))
            out.add("This is a pure-vegetarian house (no eggs or non-veg).");

        if (!Boolean.TRUE.equals(p.getSmokingAllowed()) && t.isSmokes()) out.add("Smoking is not allowed at this property.");
        if (!Boolean.TRUE.equals(p.getDrinkingAllowed()) && t.isDrinks()) out.add("Alcohol is not allowed at this property.");
        return out;
    }
}
