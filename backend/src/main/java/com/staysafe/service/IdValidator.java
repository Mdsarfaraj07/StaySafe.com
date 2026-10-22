package com.staysafe.service;

import com.staysafe.exception.ApiException;
import java.util.Set;
import java.util.regex.Pattern;

/** Format validation (and Aadhaar Verhoeff checksum) for Indian government IDs. */
public final class IdValidator {
    private IdValidator() {}

    public static final Set<String> TYPES = Set.of("PAN", "AADHAAR", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE");

    private static final Pattern PAN = Pattern.compile("[A-Z]{5}[0-9]{4}[A-Z]");
    private static final Pattern AADHAAR = Pattern.compile("[2-9][0-9]{11}");
    private static final Pattern PASSPORT = Pattern.compile("[A-PR-WY][1-9][0-9]{6}");
    private static final Pattern VOTER = Pattern.compile("[A-Z]{3}[0-9]{7}");
    private static final Pattern DL = Pattern.compile("[A-Z]{2}[0-9]{2}[0-9]{4,11}");

    public static String normalizeType(String type) {
        String t = type == null ? "" : type.trim().toUpperCase();
        if (!TYPES.contains(t)) throw ApiException.badRequest("Unsupported ID type: " + type);
        return t;
    }

    /** Returns the upper-cased ID without spaces/hyphens, or throws 400 with a helpful message. */
    public static String normalize(String type, String number) {
        String t = normalizeType(type);
        String id = number == null ? "" : number.toUpperCase().replaceAll("[\\s-]", "");
        boolean ok;
        String hint;
        switch (t) {
            case "PAN" -> { ok = PAN.matcher(id).matches(); hint = "PAN must look like ABCDE1234F"; }
            case "AADHAAR" -> { ok = AADHAAR.matcher(id).matches() && verhoeff(id); hint = "Enter a valid 12-digit Aadhaar number"; }
            case "PASSPORT" -> { ok = PASSPORT.matcher(id).matches(); hint = "Passport must be 1 letter followed by 7 digits"; }
            case "VOTER_ID" -> { ok = VOTER.matcher(id).matches(); hint = "Voter ID must be 3 letters followed by 7 digits"; }
            default -> { ok = DL.matcher(id).matches(); hint = "Driving licence must look like KA0120110012345"; }
        }
        if (!ok) throw ApiException.badRequest("Invalid ID number. " + hint);
        return id;
    }

    /** Masks everything except the last 4 characters. */
    public static String mask(String type, String id) {
        String last = id.substring(Math.max(0, id.length() - 4));
        if ("AADHAAR".equals(type)) return "XXXX XXXX " + last;
        return "X".repeat(Math.max(0, id.length() - 4)) + last;
    }

    // ---- Verhoeff checksum (used by Aadhaar) ----
    private static final int[][] D = {
        {0,1,2,3,4,5,6,7,8,9},{1,2,3,4,0,6,7,8,9,5},{2,3,4,0,1,7,8,9,5,6},{3,4,0,1,2,8,9,5,6,7},{4,0,1,2,3,9,5,6,7,8},
        {5,9,8,7,6,0,4,3,2,1},{6,5,9,8,7,1,0,4,3,2},{7,6,5,9,8,2,1,0,4,3},{8,7,6,5,9,3,2,1,0,4},{9,8,7,6,5,4,3,2,1,0}};
    private static final int[][] P = {
        {0,1,2,3,4,5,6,7,8,9},{1,5,7,6,2,8,3,0,9,4},{5,8,0,3,7,9,6,1,4,2},{8,9,1,6,0,4,3,5,2,7},
        {9,4,5,3,1,2,6,8,7,0},{4,2,8,6,5,7,3,9,0,1},{2,7,9,3,8,0,6,4,1,5},{7,0,4,6,9,1,3,2,5,8}};

    private static boolean verhoeff(String num) {
        int c = 0;
        for (int i = 0; i < num.length(); i++) {
            int digit = num.charAt(num.length() - 1 - i) - '0';
            c = D[c][P[i % 8][digit]];
        }
        return c == 0;
    }
}
