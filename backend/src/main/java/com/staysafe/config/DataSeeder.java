package com.staysafe.config;

import com.staysafe.model.*;
import com.staysafe.repo.*;
import com.staysafe.service.KycService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Seeds demo data on first run (only when the users table is empty). */
@Component
public class DataSeeder implements CommandLineRunner {
    private final UserRepository users;
    private final PropertyRepository properties;
    private final BookingRepository bookings;
    private final FavoriteRepository favorites;
    private final NotificationRepository notifications;
    private final ReviewRepository reviews;
    private final PasswordEncoder encoder;
    private final KycService kycService;
    private final ResidentRepository residentRepo;
    private final TenantProfileRepository tenantRepo;

    public DataSeeder(UserRepository users, PropertyRepository properties, BookingRepository bookings,
                      FavoriteRepository favorites, NotificationRepository notifications,
                      ReviewRepository reviews, PasswordEncoder encoder, KycService kycService,
                      ResidentRepository residentRepo, TenantProfileRepository tenantRepo) {
        this.users = users;
        this.properties = properties;
        this.bookings = bookings;
        this.favorites = favorites;
        this.notifications = notifications;
        this.reviews = reviews;
        this.encoder = encoder;
        this.kycService = kycService;
        this.residentRepo = residentRepo;
        this.tenantRepo = tenantRepo;
    }

    @Override
    public void run(String... args) {
        if (users.count() > 0) return;

        User admin = user("System Admin", "admin@staysafe.com", "Admin@123", "+91 90000 00000", Role.ADMIN);
        User rahul = user("Rahul Verma", "rahul@staysafe.com", "Owner@123", "+91 98765 43210", Role.OWNER);
        User vikram = user("Vikram Patel", "vikram@staysafe.com", "Owner@123", "+91 91234 56789", Role.OWNER);
        User priya = user("Priya Sharma", "priya@staysafe.com", "Customer@123", "+91 99999 11111", Role.CUSTOMER);

        kycService.seedVerified(rahul, "PAN", "ABCDE1234F", "Rahul Verma", "CKYC", "50012345678901",
                LocalDate.of(1988, 4, 12), "12, 4th Cross, Koramangala, Bengaluru, Karnataka 560034");
        kycService.seedVerified(vikram, "PAN", "XYZPK4321M", "Vikram Patel", "MANUAL", null,
                LocalDate.of(1984, 11, 5), "27, 5th Block, HSR Layout, Bengaluru, Karnataka 560102");

        String i1 = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80";
        String i2 = "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80";
        String i3 = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80";
        String i4 = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";
        String i5 = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";

        Property green = prop("Green Valley PG", "PG", "Koramangala, Bangalore", 7500, 15000, 4.5, 120, true, "Active", rahul,
                List.of(i1, i2, i3, i4), List.of("WiFi", "AC", "Food Included", "Laundry", "Parking"),
                "Green Valley PG offers a safe, comfortable and homely stay with modern amenities. Perfect for students and working professionals.");
        Property urban = prop("Urban Nest Co-living", "Co-living", "Indiranagar, Bangalore", 12000, 24000, 4.7, 98, true, "Active", rahul,
                List.of(i2, i3), List.of("WiFi", "AC", "Gym", "Housekeeping"),
                "Vibrant community living space designed for tech professionals and creators with top-notch coworking and social zones.");
        prop("Skyline Apartments", "Flat", "HSR Layout, Bangalore", 18000, 36000, 4.3, 76, true, "Active", vikram,
                List.of(i5), List.of("WiFi", "AC", "Parking", "Housekeeping"),
                "Spacious independent 1BHK apartments equipped with high-speed internet and modular kitchen facilities.");
        prop("Maple Residency", "PG", "BTM Layout, Bangalore", 9500, 19000, 4.2, 64, false, "Under Review", rahul,
                List.of(i3), List.of("WiFi", "AC", "Food Included", "Laundry"),
                "Cozy rooms with home-cooked meals and 24/7 security in a peaceful neighborhood.");

        booking("BK-9082", priya, green, LocalDate.now().plusDays(10), LocalDate.now().plusDays(40), "Confirmed");
        booking("BK-7612", priya, urban, LocalDate.now().minusDays(80), LocalDate.now().minusDays(50), "Confirmed"); // shows as Completed

        favorite(priya, green);
        favorite(priya, urban);

        review(green, priya, 5, "Clean room, quiet neighborhood, fast Wi-Fi and safe entrance.");

        note(priya, "Welcome to StaySafe!", "Explore verified PGs, rooms, and flats with safety guarantees.", "system");
        note(priya, "Booking Confirmed!", "Your stay at Green Valley PG is locked.", "booking");
        note(rahul, "Verification Queue Update", "Maple Residency docs uploaded! Awaiting final admin approval.", "audit");
        note(rahul, "New Guest Booking", "Priya Sharma booked Green Valley PG.", "booking");
        note(admin, "New Verification Audit Request", "Maple Residency (Rahul Verma) submitted documents for audit.", "audit");
        note(vikram, "Welcome to StaySafe!", "Your Skyline Apartments listing is live.", "system");

        // map pins for the demo listings (Bengaluru)
        for (Property p : properties.findAll()) {
            String loc = p.getLocation();
            double[] c = loc.contains("Koramangala") ? new double[]{12.9352, 77.6245}
                    : loc.contains("Indiranagar") ? new double[]{12.9784, 77.6408}
                    : loc.contains("HSR") ? new double[]{12.9116, 77.6474}
                    : new double[]{12.9166, 77.6101};
            p.setLatitude(c[0]);
            p.setLongitude(c[1]);
            p.setAddress(loc);
            properties.save(p);
        }

        seedSharing(priya);
    }

    // ---------- sharing demo data: house rules, room options, residents, a tenant profile ----------
    private void seedSharing(User priya) {
        TenantProfile tp = new TenantProfile();
        tp.setUser(priya);
        tp.setGender("FEMALE");
        tp.setDob(LocalDate.of(2002, 6, 15));
        tp.setOccupation("STUDENT");
        tp.setOrganization("Christ University");
        tp.setFoodPreference("VEG");
        tp.setSleepSchedule("NIGHT_OWL");
        tp.setLanguages("English, Hindi, Kannada");
        tp.setBio("Final-year design student. Quiet during the week, love cooking on weekends.");
        tp.setShareWithRoommates(true);
        tenantRepo.save(tp);

        for (Property p : properties.findAll()) {
            switch (p.getName()) {
                case "Green Valley PG" -> {
                    rules(p, "FEMALE_ONLY", "NON_VEG_ALLOWED", "BOTH", false, false, false, true);
                    room(p, "Triple sharing", 3, 7500, 12, 5, false, false);
                    room(p, "Double sharing (AC)", 2, 9000, 8, 3, true, false);
                    room(p, "Single room (AC)", 1, 13000, 4, 1, true, true);
                }
                case "Urban Nest Co-living" -> {
                    rules(p, "CO_ED", "NON_VEG_ALLOWED", "WORKING_PROFESSIONALS", false, true, false, true);
                    room(p, "Double sharing (AC)", 2, 12000, 10, 4, true, true);
                    room(p, "Private room (AC)", 1, 17000, 6, 2, true, true);
                }
                case "Skyline Apartments" -> {
                    rules(p, "CO_ED", "VEG_ONLY", "BOTH", false, false, true, true);
                    room(p, "Shared bedroom (2 beds)", 2, 10000, 2, 1, true, false);
                    room(p, "Master bedroom", 1, 18000, 1, 1, true, true);
                }
                default -> {   // Maple Residency
                    rules(p, "MALE_ONLY", "NON_VEG_ALLOWED", "STUDENTS", false, false, false, false);
                    room(p, "Triple sharing", 3, 9500, 9, 4, false, false);
                    room(p, "Double sharing", 2, 11000, 6, 2, false, true);
                }
            }
            p.setPrice(p.getRooms().stream().mapToInt(RoomOption::getPricePerBed).min().orElse(p.getPrice()));
            Property saved = properties.save(p);

            switch (saved.getName()) {
                case "Green Valley PG" -> {
                    resident(saved, "Double sharing (AC)", "Ananya Kulkarni", "FEMALE", 21, "STUDENT", "Christ University", "VEG", false, false, "EARLY_BIRD",
                            "Architecture student. Early riser, keeps the room tidy.", LocalDate.now().minusMonths(7));
                    resident(saved, "Triple sharing", "Meera Singh", "FEMALE", 26, "WORKING_PROFESSIONAL", "Infosys", "NON_VEG", false, false, "NIGHT_OWL",
                            "Software engineer, works late some days.", LocalDate.now().minusMonths(14));
                    resident(saved, "Triple sharing", "Divya Rao", "FEMALE", 24, "WORKING_PROFESSIONAL", "Flipkart", "VEG", false, false, "FLEXIBLE",
                            "Product analyst. Enjoys weekend trips.", LocalDate.now().minusMonths(3));
                }
                case "Urban Nest Co-living" -> {
                    resident(saved, "Double sharing (AC)", "Karthik Reddy", "MALE", 29, "WORKING_PROFESSIONAL", "Swiggy", "NON_VEG", false, true, "NIGHT_OWL",
                            "Backend developer. Gym in the morning, gaming at night.", LocalDate.now().minusMonths(5));
                    resident(saved, "Private room (AC)", "Sara Thomas", "FEMALE", 27, "WORKING_PROFESSIONAL", "Razorpay", "EGGETARIAN", false, false, "EARLY_BIRD",
                            "Designer who loves a quiet home.", LocalDate.now().minusMonths(9));
                }
                case "Skyline Apartments" -> resident(saved, "Shared bedroom (2 beds)", "Arjun Menon", "MALE", 28, "WORKING_PROFESSIONAL", "Deloitte", "VEG", false, false, "EARLY_BIRD",
                        "Consultant, travels on weekdays. Looking for a calm flatmate.", LocalDate.now().minusMonths(11));
                default -> resident(saved, "Triple sharing", "Rohit Gupta", "MALE", 20, "STUDENT", "PES University", "NON_VEG", false, false, "NIGHT_OWL",
                        "Engineering student, cricket on weekends.", LocalDate.now().minusMonths(4));
            }
        }
    }

    private void rules(Property p, String gender, String food, String tenant, boolean smoking, boolean drinking, boolean pets, boolean visitors) {
        p.setGenderPolicy(gender);
        p.setFoodPolicy(food);
        p.setTenantType(tenant);
        p.setSmokingAllowed(smoking);
        p.setDrinkingAllowed(drinking);
        p.setPetsAllowed(pets);
        p.setVisitorsAllowed(visitors);
    }

    private void room(Property p, String label, int occupancy, int price, int total, int available, boolean ac, boolean bath) {
        RoomOption r = new RoomOption();
        r.setProperty(p);
        r.setLabel(label);
        r.setOccupancy(occupancy);
        r.setPricePerBed(price);
        r.setTotalBeds(total);
        r.setAvailableBeds(available);
        r.setAcRoom(ac);
        r.setAttachedBathroom(bath);
        p.getRooms().add(r);
    }

    private void resident(Property p, String roomLabel, String name, String gender, int age, String occupation, String org,
                          String food, boolean smokes, boolean drinks, String sleep, String bio, LocalDate moveIn) {
        Resident r = new Resident();
        r.setProperty(p);
        r.setRoomOption(p.getRooms().stream().filter(x -> x.getLabel().equals(roomLabel)).findFirst().orElse(null));
        r.setName(name);
        r.setGender(gender);
        r.setAge(age);
        r.setOccupation(occupation);
        r.setOrganization(org);
        r.setFoodPreference(food);
        r.setSmokes(smokes);
        r.setDrinks(drinks);
        r.setSleepSchedule(sleep);
        r.setBio(bio);
        r.setMoveInDate(moveIn);
        r.setConsent(true);
        residentRepo.save(r);
    }

    private User user(String name, String email, String pw, String phone, Role role) {
        User u = new User();
        u.setName(name); u.setEmail(email); u.setPassword(encoder.encode(pw)); u.setPhone(phone); u.setRole(role);
        return users.save(u);
    }

    private Property prop(String name, String type, String loc, int price, int dep, double rating, int count,
                          boolean verified, String status, User owner, List<String> images, List<String> amenities, String desc) {
        Property p = new Property();
        p.setName(name); p.setType(type); p.setLocation(loc); p.setPrice(price); p.setDeposit(dep);
        p.setRating(rating); p.setReviewsCount(count); p.setVerified(verified); p.setStatus(status); p.setOwner(owner);
        p.setImages(new ArrayList<>(images)); p.setImage(images.get(0)); p.setAmenities(new ArrayList<>(amenities));
        p.setDescription(desc);
        return properties.save(p);
    }

    private void booking(String code, User u, Property p, LocalDate in, LocalDate out, String status) {
        Booking b = new Booking();
        b.setCode(code); b.setUser(u); b.setProperty(p); b.setCheckIn(in); b.setCheckOut(out);
        b.setGuests("1 Guest"); b.setAmount(p.getPrice()); b.setStatus(status);
        b.setPaymentMethod("upi"); b.setPaymentRef("RZP_SEED" + code.replace("BK-", ""));
        bookings.save(b);
        p.setBookingsCount(p.getBookingsCount() + 1);
        properties.save(p);
    }

    private void favorite(User u, Property p) {
        Favorite f = new Favorite();
        f.setUser(u); f.setProperty(p);
        favorites.save(f);
    }

    private void review(Property p, User u, int rating, String comment) {
        Review r = new Review();
        r.setProperty(p); r.setUser(u); r.setRating(rating); r.setComment(comment);
        reviews.save(r);
    }

    private void note(User u, String title, String msg, String type) {
        Notification n = new Notification();
        n.setUser(u); n.setTitle(title); n.setMessage(msg); n.setType(type);
        notifications.save(n);
    }
}
