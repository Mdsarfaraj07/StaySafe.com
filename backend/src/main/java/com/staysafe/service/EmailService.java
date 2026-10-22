package com.staysafe.service;

import com.staysafe.model.Booking;
import com.staysafe.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private final boolean enabled;
    private final String from;
    public EmailService(JavaMailSender mailSender,
            @Value("${app.mail.enabled:false}") boolean enabled,
            @Value("${spring.mail.username:}") String from) {
        this.mailSender=mailSender; this.enabled=enabled; this.from=from;
    }
    public boolean isEnabled(){ return enabled && from != null && !from.isBlank(); }
    public void sendOtp(String to, String otp, String purpose) {
        String subject = switch(purpose) {
            case "REGISTER" -> "Verify your StaySafe email";
            case "LOGIN" -> "Your StaySafe sign-in code";
            case "RESET_PASSWORD" -> "Reset your StaySafe password";
            default -> "Your StaySafe verification code";
        };
        send(to, subject, "Your StaySafe verification code is: " + otp
                + "\n\nThis code expires in 10 minutes and can be used only once. "
                + "Never share this code with anyone. If you did not request it, ignore this email.");
    }
    public void sendBookingConfirmation(Booking b) {
        if (b == null || b.getUser() == null) return;
        String text = "Hello " + b.getUser().getName() + ",\n\n"
                + "Your StaySafe booking is confirmed.\n"
                + "Booking code: " + b.getCode() + "\n"
                + "Property: " + b.getProperty().getName() + "\n"
                + "Location: " + b.getProperty().getLocation() + "\n"
                + "Check-in: " + b.getCheckIn() + "\n"
                + "Check-out: " + b.getCheckOut() + "\n"
                + "Amount: INR " + b.getAmount() + "\n"
                + "Status: " + b.getStatus() + "\n\n"
                + "Sign in to StaySafe to view your booking details.";
        send(b.getUser().getEmail(), "StaySafe booking confirmed — " + b.getCode(), text);
    }
    public void send(String to, String subject, String body) {
        if (!isEnabled()) {
            log.warn("Email delivery is disabled; not delivered to {} (subject: {}). Configure SMTP to enable email.", to, subject);
            return;
        }
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from); msg.setTo(to); msg.setSubject(subject); msg.setText(body);
        mailSender.send(msg);
    }
}
