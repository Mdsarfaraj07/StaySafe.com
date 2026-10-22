package com.staysafe.controller;

import com.staysafe.dto.Dtos.*;
import com.staysafe.dto.Mapper;
import com.staysafe.model.Role;
import com.staysafe.model.Ticket;
import com.staysafe.model.User;
import com.staysafe.repo.TicketRepository;
import com.staysafe.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {
    private final TicketRepository tickets;
    private final NotificationService notifications;

    public TicketController(TicketRepository tickets, NotificationService notifications) {
        this.tickets = tickets;
        this.notifications = notifications;
    }

    @GetMapping("/me")
    public List<TicketDto> mine(@AuthenticationPrincipal User user) {
        return tickets.findByUserOrderByCreatedAtDesc(user).stream().map(Mapper::ticket).toList();
    }

    @PostMapping
    public TicketDto create(@AuthenticationPrincipal User user, @Valid @RequestBody TicketRequest req) {
        Ticket t = new Ticket();
        t.setCode("TKT-" + (100 + (int) (Math.random() * 900)));
        t.setUser(user);
        t.setSubject(req.subject());
        t.setMessage(req.message());
        tickets.save(t);
        notifications.notifyRole(Role.ADMIN, "New Support Ticket",
                user.getName() + " (" + user.getEmail() + ") raised " + t.getCode() + ": " + t.getSubject(),
                "support", "ticket", t.getId());
        notifications.notify(user, "Support Ticket " + t.getCode() + " Created",
                "We received your ticket \"" + t.getSubject() + "\". Updates are linked to " + user.getEmail() + ".",
                "support", "ticket", t.getId());
        return Mapper.ticket(t);
    }
}
