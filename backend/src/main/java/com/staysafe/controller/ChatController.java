package com.staysafe.controller;

import com.staysafe.exception.ApiException;
import com.staysafe.model.ChatMessage;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.ChatMessageRepository;
import com.staysafe.repo.UserRepository;
import com.staysafe.service.NotificationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatMessageRepository messages;
    private final UserRepository users;
    private final NotificationService notifications;

    public ChatController(ChatMessageRepository messages, UserRepository users, NotificationService notifications) {
        this.messages = messages; this.users = users; this.notifications = notifications;
    }

    public record SendMessage(@NotBlank @Size(max = 2000) String message) {}
    public record MessageDto(Long id, Long conversationUserId, String senderName, boolean fromSupport,
                             String message, LocalDateTime createdAt) {}
    public record ConversationDto(Long userId, String name, String email, String role, String lastMessage, LocalDateTime updatedAt) {}

    /** Customers and owners can only access their own support conversation. */
    @GetMapping("/messages")
    public List<MessageDto> mine(@AuthenticationPrincipal User user) {
        if (user.getRole() == Role.ADMIN) throw ApiException.forbidden("Admins must select a support conversation");
        return messages.findByConversationUserOrderByCreatedAtAsc(user).stream().map(ChatController::dto).toList();
    }

    @PostMapping("/messages")
    public MessageDto send(@AuthenticationPrincipal User user, @Valid @RequestBody SendMessage request) {
        if (user.getRole() == Role.ADMIN) throw ApiException.forbidden("Use the admin reply endpoint");
        ChatMessage m = new ChatMessage();
        m.setConversationUser(user); m.setSender(user); m.setFromSupport(false);
        m.setMessage(request.message().trim());
        ChatMessage saved = messages.save(m);
        notifications.notifyRole(Role.ADMIN, "New live chat message", "A user sent a new support message.", "support", "chat", user.getId());
        return dto(saved);
    }

    @GetMapping("/admin/conversations")
    public List<ConversationDto> conversations(@AuthenticationPrincipal User admin) {
        requireAdmin(admin);
        java.util.Map<Long, ChatMessage> latest = new java.util.LinkedHashMap<>();
        for (ChatMessage m : messages.findTop100ByOrderByCreatedAtDesc()) latest.putIfAbsent(m.getConversationUser().getId(), m);
        return latest.values().stream().map(m -> new ConversationDto(m.getConversationUser().getId(),
                m.getConversationUser().getName(), m.getConversationUser().getEmail(),
                m.getConversationUser().getRole().name(), m.getMessage(), m.getCreatedAt())).toList();
    }

    @GetMapping("/admin/{userId}/messages")
    public List<MessageDto> forAdmin(@AuthenticationPrincipal User admin, @PathVariable Long userId) {
        requireAdmin(admin);
        User target = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        return messages.findByConversationUserOrderByCreatedAtAsc(target).stream().map(ChatController::dto).toList();
    }

    @PostMapping("/admin/{userId}/messages")
    public MessageDto reply(@AuthenticationPrincipal User admin, @PathVariable Long userId,
                            @Valid @RequestBody SendMessage request) {
        requireAdmin(admin);
        User target = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        ChatMessage m = new ChatMessage(); m.setConversationUser(target); m.setSender(admin);
        m.setFromSupport(true); m.setMessage(request.message().trim());
        ChatMessage saved = messages.save(m);
        notifications.notify(target, "New StaySafe support reply", "Support has replied to your live chat.", "support", "chat", target.getId());
        return dto(saved);
    }

    private static void requireAdmin(User user) {
        if (user.getRole() != Role.ADMIN) throw ApiException.forbidden("Admin access required");
    }
    private static MessageDto dto(ChatMessage m) {
        return new MessageDto(m.getId(), m.getConversationUser().getId(), m.getSender().getName(),
                m.isFromSupport(), m.getMessage(), m.getCreatedAt());
    }
}
