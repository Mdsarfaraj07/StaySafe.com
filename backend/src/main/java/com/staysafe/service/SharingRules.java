package com.staysafe.service;

import com.staysafe.exception.ApiException;
import java.time.LocalDate;
import java.time.Period;
import java.util.Set;

/** Allowed values + small helpers for the room / flat / PG sharing features. */
public final class SharingRules {
    private SharingRules() {}

    public static final Set<String> GENDER_POLICIES = Set.of("MALE_ONLY", "FEMALE_ONLY", "CO_ED");
    public static final Set<String> FOOD_POLICIES = Set.of("VEG_ONLY", "NON_VEG_ALLOWED");
    public static final Set<String> TENANT_TYPES = Set.of("STUDENTS", "WORKING_PROFESSIONALS", "BOTH");
    public static final Set<String> GENDERS = Set.of("MALE", "FEMALE", "OTHER");
    public static final Set<String> OCCUPATIONS = Set.of("STUDENT", "WORKING_PROFESSIONAL", "OTHER");
    public static final Set<String> FOODS = Set.of("VEG", "EGGETARIAN", "NON_VEG");
    public static final Set<String> SLEEP = Set.of("EARLY_BIRD", "NIGHT_OWL", "FLEXIBLE");

    public static String orDefault(String v, String def) {
        return v == null || v.isBlank() ? def : v;
    }

    /** Optional value: blank -> default, otherwise must be one of the allowed values. */
    public static String pick(String v, Set<String> allowed, String def, String field) {
        if (v == null || v.isBlank()) return def;
        String u = v.trim().toUpperCase();
        if (!allowed.contains(u)) throw ApiException.badRequest("Invalid " + field + ": " + v);
        return u;
    }

    /** Required value. */
    public static String require(String v, Set<String> allowed, String field) {
        if (v == null || v.isBlank()) throw ApiException.badRequest(field + " is required");
        return pick(v, allowed, null, field);
    }

    public static int age(LocalDate dob) {
        return dob == null ? 0 : Period.between(dob, LocalDate.now()).getYears();
    }

    public static String ageGroup(int age) {
        if (age < 23) return "18-22";
        if (age < 28) return "23-27";
        if (age < 36) return "28-35";
        return "36+";
    }
}
