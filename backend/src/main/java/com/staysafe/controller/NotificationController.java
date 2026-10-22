package com.staysafe.controller;

import com.staysafe.dto.Dtos.NotificationDto;
import com.staysafe.dto.Mapper;
import com.staysafe.exception.ApiException;
import com.staysafe.model.Notification;
import com.staysafe.model.User;
import com.staysafe.repo.NotificationRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository repo;

    public NotificationController(NotificationRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<NotificationDto> mine(@AuthenticationPrincipal User user) {
        return repo.findByUserOrderByCreatedAtDesc(user).stream().limit(50).map(Mapper::notification).toList();
    }

    @PutMapping("/{id}/read")
    public void markRead(@PathVariable Long id, @AuthenticationPrincipal User user) {
        Notification n = repo.findById(id).orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (!n.getUser().getId().equals(user.getId())) throw ApiException.forbidden("Not your notification");
        n.setUnread(false);
        repo.save(n);
    }

    @PutMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal User user) {
        List<Notification> unread = repo.findByUserAndUnreadTrue(user);
        unread.forEach(n -> n.setUnread(false));
        repo.saveAll(unread);
    }
}
