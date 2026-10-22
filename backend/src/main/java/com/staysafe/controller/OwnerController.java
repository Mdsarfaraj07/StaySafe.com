package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.Role;
import com.staysafe.model.RoomOption;
import com.staysafe.model.User;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.service.FileStorageService;
import com.staysafe.service.KycService;
import com.staysafe.service.NotificationService;
import com.staysafe.service.SharingRules;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** All endpoints require ROLE_OWNER (see SecurityConfig). */
@RestController
@RequestMapping("/api/owner")
public class OwnerController {
    public static final double COMMISSION = 0.10;

    private final PropertyRepository properties;
    private final BookingRepository bookings;
    private final NotificationService notifications;
    private final KycService kyc;
    private final FileStorageService storage;

    public OwnerController(PropertyRepository properties, BookingRepository bookings, NotificationService notifications, KycService kyc,
                           FileStorageService storage) {
        this.properties = properties;
        this.bookings = bookings;
        this.notifications = notifications;
        this.kyc = kyc;
        this.storage = storage;
    }

    @GetMapping("/properties")
    public List<PropertyDto> myProperties(@AuthenticationPrincipal User owner) {
        return properties.findByOwnerOrderByIdDesc(owner).stream().map(Mapper::property).toList();
    }

    private static final int MAX_PHOTOS = 8;

    /** Upload property photos (multipart field "files"); returns their URLs to be sent with the listing. */
    @PostMapping(value = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadPhotos(@RequestParam("files") List<MultipartFile> files) {
        if (files.isEmpty()) throw ApiException.badRequest("No files selected");
        if (files.size() > MAX_PHOTOS) throw ApiException.badRequest("You can upload up to " + MAX_PHOTOS + " photos at a time");
        List<String> urls = new ArrayList<>();
        for (MultipartFile f : files) urls.add(storage.store(f, "property"));
        return Map.of("urls", urls);
    }

    @PostMapping("/properties")
    public PropertyDto create(@AuthenticationPrincipal User owner, @Valid @RequestBody PropertyRequest req) {
        if (!kyc.canList(owner))
            throw ApiException.forbidden("Complete KYC verification before listing a property");
        Property p = new Property();
        apply(p, req);
        p.setOwner(owner);
        p.setStatus("Under Review");
        p.setVerified(false);
        properties.save(p);

        notifications.notifyRole(Role.ADMIN, "New Verification Audit Request",
                p.getName() + " (" + owner.getName() + ") submitted documents for audit.", "audit");
        notifications.notify(owner, "Listing Submitted",
                p.getName() + " is awaiting admin verification.", "system");
        return Mapper.property(p);
    }

    /**
     * Edit a listing (details, photos, map location). Changing the map location / address of a live
     * listing - or editing a rejected one - sends it back for admin review.
     */
    @PutMapping("/properties/{id}")
    public PropertyDto update(@PathVariable Long id, @AuthenticationPrincipal User owner,
                              @Valid @RequestBody PropertyRequest req) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!p.getOwner().getId().equals(owner.getId())) throw ApiException.forbidden("Not your property");

        boolean hadPin = p.getLatitude() != null && p.getLongitude() != null;
        boolean moved = hadPin && (!Objects.equals(p.getLatitude(), req.latitude())
                || !Objects.equals(p.getLongitude(), req.longitude())
                || !Objects.equals(p.getLocation(), req.location()));
        List<String> oldImages = new ArrayList<>(p.getImages());

        apply(p, req);
        oldImages.stream().filter(u -> !p.getImages().contains(u)).forEach(storage::delete);

        if ("Rejected".equals(p.getStatus()) || (moved && "Active".equals(p.getStatus()))) {
            p.setStatus("Under Review");
            p.setVerified(false);
            notifications.notifyRole(Role.ADMIN, "Listing Resubmitted",
                    p.getName() + " (" + owner.getName() + ") was updated and needs re-verification.", "audit");
        }
        Property saved = properties.save(p);
        return Mapper.property(saved);
    }

    private void apply(Property p, PropertyRequest req) {
        double lat = req.latitude();
        double lng = req.longitude();
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw ApiException.badRequest("Invalid map coordinates");
        List<String> imgs = cleanImages(req.images());
        if (imgs.isEmpty()) throw ApiException.badRequest("Upload at least one property photo");

        p.setName(req.name().trim());
        p.setType(req.type());
        p.setLocation(req.location().trim());
        p.setAddress(req.address() == null ? null : req.address().trim());
        p.setLatitude(lat);
        p.setLongitude(lng);
        p.setGenderPolicy(SharingRules.pick(req.genderPolicy(), SharingRules.GENDER_POLICIES, "CO_ED", "gender policy"));
        p.setFoodPolicy(SharingRules.pick(req.foodPolicy(), SharingRules.FOOD_POLICIES, "NON_VEG_ALLOWED", "food policy"));
        p.setTenantType(SharingRules.pick(req.tenantType(), SharingRules.TENANT_TYPES, "BOTH", "tenant type"));
        p.setSmokingAllowed(Boolean.TRUE.equals(req.smokingAllowed()));
        p.setDrinkingAllowed(Boolean.TRUE.equals(req.drinkingAllowed()));
        p.setPetsAllowed(Boolean.TRUE.equals(req.petsAllowed()));
        p.setVisitorsAllowed(!Boolean.FALSE.equals(req.visitorsAllowed()));
        syncRooms(p, req.rooms());                         // also sets p.price = cheapest bed
        p.setDeposit(req.deposit() != null && req.deposit() > 0 ? req.deposit() : p.getPrice() * 2);
        p.setDescription(req.description() == null || req.description().isBlank()
                ? "Newly listed property awaiting admin verification." : req.description());
        p.setAmenities(new ArrayList<>(req.amenities() == null || req.amenities().isEmpty() ? List.of("WiFi") : req.amenities()));
        p.setImages(new ArrayList<>(imgs));
        p.setImage(imgs.get(0));          // first photo is the cover
    }

    /**
     * Creates / updates room options from the request. Options missing from the request are hidden
     * (not deleted) because bookings may still reference them.
     */
    private void syncRooms(Property p, List<RoomRequest> reqs) {
        Map<Long, RoomOption> existing = new java.util.HashMap<>();
        for (RoomOption r : p.getRooms()) if (r.getId() != null) existing.put(r.getId(), r);
        java.util.Set<Long> keep = new java.util.HashSet<>();

        for (RoomRequest rr : reqs) {
            if (rr.availableBeds() > rr.totalBeds())
                throw ApiException.badRequest("Available beds cannot exceed total beds for \"" + rr.label() + "\"");
            RoomOption ro;
            if (rr.id() != null) {
                ro = existing.get(rr.id());
                if (ro == null) throw ApiException.badRequest("Unknown room option");
                keep.add(ro.getId());
            } else {
                ro = new RoomOption();
                ro.setProperty(p);
                p.getRooms().add(ro);
            }
            ro.setLabel(rr.label().trim());
            ro.setOccupancy(rr.occupancy());
            ro.setPricePerBed(rr.pricePerBed());
            ro.setTotalBeds(rr.totalBeds());
            ro.setAvailableBeds(rr.availableBeds());
            ro.setAcRoom(rr.acRoom());
            ro.setAttachedBathroom(rr.attachedBathroom());
            ro.setActive(true);
        }
        for (RoomOption r : p.getRooms()) if (r.getId() != null && !keep.contains(r.getId())) r.setActive(false);

        p.setPrice(p.getRooms().stream().filter(RoomOption::isActive).mapToInt(RoomOption::getPricePerBed).min()
                .orElseThrow(() -> ApiException.badRequest("Add at least one room option")));
    }

    /** Only our own uploads or https URLs are accepted (blocks javascript:, data:, http: etc.). */
    private static List<String> cleanImages(List<String> in) {
        if (in == null) return List.of();
        List<String> out = in.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).distinct().toList();
        if (out.size() > MAX_PHOTOS) throw ApiException.badRequest("A listing can have at most " + MAX_PHOTOS + " photos");
        for (String u : out) {
            if (!(u.startsWith(FileStorageService.URL_PREFIX) || u.startsWith("https://")))
                throw ApiException.badRequest("Invalid image URL");
        }
        return out;
    }

    @GetMapping("/bookings")
    public List<BookingDto> incoming(@AuthenticationPrincipal User owner) {
        return bookings.findByPropertyOwnerOrderByCreatedAtDesc(owner).stream().map(Mapper::booking).toList();
    }

    /**
     * Customers who booked this owner's properties (never other owners' customers).
     * Search by customer name / email / phone, booking code or property name.
     */
    @GetMapping("/customers")
    public List<CustomerDto> customers(@AuthenticationPrincipal User owner,
                                       @RequestParam(required = false) String q) {
        String needle = q == null ? "" : q.trim().toLowerCase();
        Map<Long, List<Booking>> grouped = new LinkedHashMap<>();
        for (Booking b : bookings.findByPropertyOwnerOrderByCreatedAtDesc(owner)) {
            grouped.computeIfAbsent(b.getUser().getId(), k -> new ArrayList<>()).add(b);
        }

        List<CustomerDto> result = new ArrayList<>();
        for (List<Booking> list : grouped.values()) {
            User c = list.get(0).getUser();
            List<BookingDto> dtos = list.stream().map(Mapper::booking).toList();
            if (!needle.isEmpty()) {
                boolean match = has(c.getName(), needle) || has(c.getEmail(), needle) || has(c.getPhone(), needle)
                        || dtos.stream().anyMatch(d -> has(d.id(), needle) || has(d.propertyName(), needle));
                if (!match) continue;
            }
            long active = dtos.stream().filter(d -> "Confirmed".equals(d.status())).count();
            long paid = dtos.stream().filter(d -> !"Cancelled".equals(d.status())).mapToLong(BookingDto::amount).sum();
            List<String> props = dtos.stream().map(BookingDto::propertyName).distinct().toList();
            result.add(new CustomerDto(c.getId(), c.getName(), c.getEmail(), c.getPhone(), list.size(), (int) active,
                    paid, list.get(0).getCreatedAt().toLocalDate().toString(), props, dtos));
        }
        return result;
    }

    private static boolean has(String s, String needle) {
        return s != null && s.toLowerCase().contains(needle);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@AuthenticationPrincipal User owner) {
        List<Property> mine = properties.findByOwnerOrderByIdDesc(owner);
        List<Booking> bk = bookings.findByPropertyOwnerOrderByCreatedAtDesc(owner).stream()
                .filter(b -> !"Cancelled".equals(b.getStatus())).toList();
        int gross = bk.stream().mapToInt(Booking::getAmount).sum();
        return Map.of(
                "listedProperties", mine.size(),
                "activeBookings", bk.size(),
                "totalEarnings", Math.round(gross * (1 - COMMISSION)),
                "pendingVerifications", mine.stream().filter(p -> "Under Review".equals(p.getStatus())).count());
    }
}
