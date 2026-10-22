package com.staysafe.config;

import com.staysafe.model.Booking;
import com.staysafe.model.Property;
import com.staysafe.model.RoomOption;
import com.staysafe.repo.BookingRepository;
import com.staysafe.repo.PropertyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.List;

/**
 * Upgrades listings created before sharing existed: fills in the default house rules and gives each
 * property one "Standard room" option at its old price, so booking keeps working. Owners can edit it.
 */
@Component
public class SharingMigration implements CommandLineRunner {
    private final PropertyRepository properties;
    private final BookingRepository bookings;

    public SharingMigration(PropertyRepository properties, BookingRepository bookings) {
        this.properties = properties;
        this.bookings = bookings;
    }

    @Override
    public void run(String... args) {
        List<Booking> all = bookings.findAll();
        LocalDate today = LocalDate.now();
        for (Property p : properties.findAll()) {
            boolean changed = false;
            if (p.getGenderPolicy() == null) { p.setGenderPolicy("CO_ED"); changed = true; }
            if (p.getFoodPolicy() == null) { p.setFoodPolicy("NON_VEG_ALLOWED"); changed = true; }
            if (p.getTenantType() == null) { p.setTenantType("BOTH"); changed = true; }
            if (p.getSmokingAllowed() == null) { p.setSmokingAllowed(false); changed = true; }
            if (p.getDrinkingAllowed() == null) { p.setDrinkingAllowed(false); changed = true; }
            if (p.getPetsAllowed() == null) { p.setPetsAllowed(false); changed = true; }
            if (p.getVisitorsAllowed() == null) { p.setVisitorsAllowed(true); changed = true; }

            if (p.getRooms().stream().noneMatch(RoomOption::isActive)) {
                long occupied = all.stream().filter(b -> b.getProperty().getId().equals(p.getId())
                        && "Confirmed".equals(b.getStatus()) && !b.getCheckOut().isBefore(today)).count();
                int total = (int) Math.max(5, occupied + 3);
                RoomOption ro = new RoomOption();
                ro.setProperty(p);
                ro.setLabel("Standard room");
                ro.setOccupancy(1);
                ro.setPricePerBed(Math.max(1, p.getPrice()));
                ro.setTotalBeds(total);
                ro.setAvailableBeds((int) (total - occupied));
                p.getRooms().add(ro);
                changed = true;
            }
            if (changed) properties.save(p);
        }
    }
}
