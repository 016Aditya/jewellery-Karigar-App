package com.goldproject.goldproject.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "item_tracking")
@Data
public class ItemTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_item_id", nullable = false)
    @ToString.Exclude
    private BillItem billItem;

    @Column(name = "current_stage")
    private String currentStage;

    private Integer progress;

    @Column(name = "assigned_to")
    private String assignedTo;

    private LocalDate eta;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    public void updateTimestamp() {
        this.lastUpdated = LocalDateTime.now();
    }
}