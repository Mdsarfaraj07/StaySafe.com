package com.staysafe.service;

import com.staysafe.model.Notification;
import com.staysafe.model.Role;
import com.staysafe.model.User;
import com.staysafe.repo.NotificationRepository;
import com.staysafe.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository repo;
    private final UserRepository users;
    private final JavaMailSender mailSender;
    @Value("${app.mail.enabled:false}") private boolean mailEnabled;
    @Value("${spring.mail.username:}") private String fromAddress;
    @Value("${app.frontend.url:http://localhost:5173}") private String frontendUrl;

    public NotificationService(NotificationRepository repo, UserRepository users, JavaMailSender mailSender) {
        this.repo = repo; this.users = users; this.mailSender = mailSender;
    }

    public void notify(User user, String title, String message, String type) {
        saveAndEmail(user, title, message, type, null, null);
    }

    public void notify(User user, String title, String message, String type, String refType, Long refId) {
        saveAndEmail(user, title, message, type, refType, refId);
    }

    public void notifyRole(Role role, String title, String message, String type, String refType, Long refId) {
        users.findByRole(role).forEach(u -> notify(u, title, message, type, refType, refId));
    }

    public void notifyRole(Role role, String title, String message, String type) {
        users.findByRole(role).forEach(u -> notify(u, title, message, type));
    }

    private void saveAndEmail(User user, String title, String message, String type, String refType, Long refId) {
        Notification n = new Notification();
        n.setUser(user); n.setTitle(title); n.setMessage(message); n.setType(type);
        n.setRefType(refType); n.setRefId(refId);
        repo.save(n);
        sendEmailBestEffort(user, title, message, refType, refId);
    }

    private void sendEmailBestEffort(User user, String title, String message, String refType, Long refId) {
        if (!mailEnabled || user.getEmail() == null || user.getEmail().isBlank()) return;
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            if (fromAddress != null && !fromAddress.isBlank()) mail.setFrom(fromAddress);
            mail.setTo(user.getEmail());
            mail.setSubject("StaySafe: " + title);
            String target = refType == null ? "" : "\n\nOpen StaySafe to view the related update.";
            mail.setText("Hello " + (user.getName() == null ? "there" : user.getName()) + ",\n\n"
                    + title + "\n\n" + message + target + "\n\nStaySafe\n" + frontendUrl);
            mailSender.send(mail);
        } catch (MailException | IllegalStateException ex) {
            // Notification is already persisted. Mail delivery failures must not roll back bookings/tickets.
            log.warn("Could not email StaySafe notification to registered user id {}", user.getId());
        }
    }
}
