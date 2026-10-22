package com.staysafe.service;

import com.staysafe.model.RoomOption;
import com.staysafe.repo.RoomOptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bed inventory: giving a bed back when a booking is cancelled / refunded. */
@Service
public class InventoryService {
    private final RoomOptionRepository rooms;

    public InventoryService(RoomOptionRepository rooms) {
        this.rooms = rooms;
    }

    @Transactional
    public void release(RoomOption option) {
        if (option == null) return;
        rooms.findWithLockById(option.getId()).ifPresent(r -> {
            r.setAvailableBeds(Math.min(r.getTotalBeds(), r.getAvailableBeds() + 1));
            rooms.save(r);
        });
    }
}
