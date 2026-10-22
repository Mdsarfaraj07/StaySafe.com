package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Property;
import com.staysafe.model.Review;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.repo.ReviewRepository;
import com.staysafe.model.RoomOption;
import com.staysafe.service.EligibilityService;
import com.staysafe.service.RoommateService;
import com.staysafe.service.SharingRules;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {
    private final PropertyRepository properties;
    private final ReviewRepository reviews;
    private final BookingRepository bookings;
    private final RoommateService roommateService;
    private final EligibilityService eligibilityService;

    public PropertyController(PropertyRepository properties, ReviewRepository reviews, BookingRepository bookings,
                              RoommateService roommateService, EligibilityService eligibilityService) {
        this.properties = properties;
        this.reviews = reviews;
        this.bookings = bookings;
        this.roommateService = roommateService;
        this.eligibilityService = eligibilityService;
    }

    /** Public: only verified & active listings. Optional filters: q, type, maxPrice */
    @GetMapping
    public List<PropertyDto> list(@RequestParam(required = false) String q,
                                  @RequestParam(required = false) String type,
                                  @RequestParam(required = false) Integer minPrice,
                                  @RequestParam(required = false) Integer maxPrice,
                                  @RequestParam(required = false) String gender,       // MALE | FEMALE | CO_ED
                                  @RequestParam(required = false) String food,         // VEG_ONLY | NON_VEG_ALLOWED
                                  @RequestParam(required = false) String tenant,       // STUDENTS | WORKING_PROFESSIONALS
                                  @RequestParam(required = false) Integer occupancy,   // 1, 2, 3, 4 (= 4 or more)
                                  @RequestParam(required = false) Boolean availableOnly) {
        return properties.findByStatusOrderByIdAsc("Active").stream()
                .filter(p -> q == null || q.isBlank()
                        || p.getName().toLowerCase().contains(q.toLowerCase())
                        || p.getLocation().toLowerCase().contains(q.toLowerCase()))
                .filter(p -> type == null || type.equals("All") || p.getType().equals(type))
                .filter(p -> minPrice == null || p.getPrice() >= minPrice)
                .filter(p -> maxPrice == null || p.getPrice() <= maxPrice)
                .filter(p -> genderFits(p, gender))
                .filter(p -> food == null || food.isBlank() || "ANY".equals(food)
                        || food.equals(SharingRules.orDefault(p.getFoodPolicy(), "NON_VEG_ALLOWED")))
                .filter(p -> tenantFits(p, tenant))
                .filter(p -> occupancy == null || p.getRooms().stream().anyMatch(r -> r.isActive()
                        && (occupancy >= 4 ? r.getOccupancy() >= 4 : r.getOccupancy() == occupancy)))
                .filter(p -> !Boolean.TRUE.equals(availableOnly)
                        || p.getRooms().stream().anyMatch(r -> r.isActive() && r.getAvailableBeds() > 0))
                .map(Mapper::property).toList();
    }

    @GetMapping("/{id}")
    public PropertyDto one(@PathVariable Long id) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        return Mapper.property(p);
    }

    @GetMapping("/{id}/reviews")
    public List<ReviewDto> listReviews(@PathVariable Long id) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        return reviews.findByPropertyOrderByCreatedAtDesc(p).stream().map(Mapper::review).toList();
    }

    /** Roommates / flatmates of a property (login required - this is personal-ish data). */
    @GetMapping("/{id}/roommates")
    public List<RoommateDto> roommates(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        return roommateService.forProperty(p, user);
    }

    /** Can the logged-in customer book here? (gender / food / occupation / lifestyle rules) */
    @GetMapping("/{id}/eligibility")
    public EligibilityDto eligibility(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        List<String> problems = eligibilityService.problems(user, p);
        return new EligibilityDto(problems.isEmpty(), problems);
    }

    private static boolean genderFits(Property p, String g) {
        if (g == null || g.isBlank() || "ANY".equals(g)) return true;
        String policy = SharingRules.orDefault(p.getGenderPolicy(), "CO_ED");
        return switch (g) {
            case "MALE" -> !"FEMALE_ONLY".equals(policy);
            case "FEMALE" -> !"MALE_ONLY".equals(policy);
            case "CO_ED" -> "CO_ED".equals(policy);
            default -> true;
        };
    }

    private static boolean tenantFits(Property p, String t) {
        if (t == null || t.isBlank() || "ANY".equals(t)) return true;
        String type = SharingRules.orDefault(p.getTenantType(), "BOTH");
        return "BOTH".equals(type) || type.equals(t);
    }

    @PostMapping("/{id}/reviews")
    public ReviewDto addReview(@PathVariable Long id, @AuthenticationPrincipal User user,
                               @Valid @RequestBody ReviewRequest req) {
        if (user.getRole() != Role.CUSTOMER) throw ApiException.forbidden("Only customers can review stays");
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!bookings.existsByUserAndPropertyAndStatusNot(user, p, "Cancelled"))
            throw ApiException.forbidden("Book this stay before reviewing it");
        if (reviews.existsByPropertyAndUser(p, user)) throw ApiException.conflict("You already reviewed this stay");

        Review r = new Review();
        r.setProperty(p);
        r.setUser(user);
        r.setRating(req.rating());
        r.setComment(req.comment());
        reviews.save(r);

        double total = p.getRating() * p.getReviewsCount() + req.rating();
        p.setReviewsCount(p.getReviewsCount() + 1);
        p.setRating(Math.round(total / p.getReviewsCount() * 10.0) / 10.0);
        properties.save(p);
        return Mapper.review(r);
    }
}
