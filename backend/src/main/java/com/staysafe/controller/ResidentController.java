package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Property;
import com.staysafe.model.Resident;
import com.staysafe.model.RoomOption;
import com.staysafe.model.User;
import com.staysafe.repo.PropertyRepository;
import com.staysafe.repo.ResidentRepository;
import com.staysafe.service.SharingRules;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** Owner manages the current residents / flatmates shown as "roommates" (ROLE_OWNER via /api/owner/**). */
@RestController
@RequestMapping("/api/owner/properties/{propertyId}/residents")
public class ResidentController {
    private final PropertyRepository properties;
    private final ResidentRepository residents;

    public ResidentController(PropertyRepository properties, ResidentRepository residents) {
        this.properties = properties;
        this.residents = residents;
    }

    @GetMapping
    public List<ResidentDto> list(@PathVariable Long propertyId, @AuthenticationPrincipal User owner) {
        Property p = own(propertyId, owner);
        return residents.findByPropertyOrderByIdAsc(p).stream().map(Mapper::resident).toList();
    }

    @PostMapping
    public ResidentDto create(@PathVariable Long propertyId, @AuthenticationPrincipal User owner,
                              @Valid @RequestBody ResidentRequest req) {
        Property p = own(propertyId, owner);
        Resident r = new Resident();
        r.setProperty(p);
        apply(r, p, req);
        return Mapper.resident(residents.save(r));
    }

    @PutMapping("/{id}")
    public ResidentDto update(@PathVariable Long propertyId, @PathVariable Long id, @AuthenticationPrincipal User owner,
                              @Valid @RequestBody ResidentRequest req) {
        Property p = own(propertyId, owner);
        Resident r = find(id, p);
        apply(r, p, req);
        return Mapper.resident(residents.save(r));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long propertyId, @PathVariable Long id, @AuthenticationPrincipal User owner) {
        Property p = own(propertyId, owner);
        residents.delete(find(id, p));
    }

    private Property own(Long id, User owner) {
        Property p = properties.findById(id).orElseThrow(() -> ApiException.notFound("Property not found"));
        if (!p.getOwner().getId().equals(owner.getId())) throw ApiException.forbidden("Not your property");
        return p;
    }

    private Resident find(Long id, Property p) {
        Resident r = residents.findById(id).orElseThrow(() -> ApiException.notFound("Resident not found"));
        if (!r.getProperty().getId().equals(p.getId())) throw ApiException.forbidden("Resident belongs to another property");
        return r;
    }

    private void apply(Resident r, Property p, ResidentRequest req) {
        if (!req.consent()) throw ApiException.badRequest("Confirm that the resident agreed to share these details with prospective tenants");
        RoomOption room = null;
        if (req.roomId() != null) {
            room = p.getRooms().stream().filter(x -> x.getId().equals(req.roomId())).findFirst()
                    .orElseThrow(() -> ApiException.badRequest("Room option does not belong to this property"));
        }
        r.setRoomOption(room);
        r.setName(req.name().trim());
        r.setGender(SharingRules.require(req.gender(), SharingRules.GENDERS, "Gender"));
        r.setAge(req.age());
        r.setOccupation(SharingRules.require(req.occupation(), SharingRules.OCCUPATIONS, "Occupation"));
        r.setOrganization(blank(req.organization()));
        r.setFoodPreference(SharingRules.require(req.foodPreference(), SharingRules.FOODS, "Food preference"));
        r.setSmokes(req.smokes());
        r.setDrinks(req.drinks());
        r.setSleepSchedule(SharingRules.pick(req.sleepSchedule(), SharingRules.SLEEP, null, "sleep schedule"));
        r.setBio(req.bio() == null || req.bio().isBlank() ? null : req.bio().trim().substring(0, Math.min(500, req.bio().trim().length())));
        r.setMoveInDate(req.moveInDate());
        r.setConsent(true);
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
