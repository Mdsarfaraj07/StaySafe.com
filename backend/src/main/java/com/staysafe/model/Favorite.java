package com.staysafe.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "property_id"}))
@Getter @Setter @NoArgsConstructor
public class Favorite {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false) private User user;
    @ManyToOne(optional = false) private Property property;
}
