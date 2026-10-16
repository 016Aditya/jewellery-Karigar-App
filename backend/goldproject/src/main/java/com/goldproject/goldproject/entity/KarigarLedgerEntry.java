package com.goldproject.goldproject.entity;

import com.goldproject.goldproject.enums.LedgerEntryType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// An immutable chain-of-custody record — every ISSUE (material dispatched to a karigar) or
// RETURN (material received back) is logged here and never edited or deleted afterward.
// purityFactor is snapshotted at entry time so historical entries stay correct even if the
// purity registry's factors are ever revisited.
@Entity
@Table(name = "karigar_ledger_entries")
@Data
public class KarigarLedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private KarigarAccount account;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false)
    private LedgerEntryType entryType;

    // Purity registry key, e.g. "22K", "18K_ROSE", "SILVER_925", "PT_950"
    @Column(nullable = false)
    private String purity;

    @Column(name = "gross_weight", nullable = false, precision = 19, scale = 4)
    private BigDecimal grossWeight;

    @Column(name = "purity_factor", nullable = false, precision = 12, scale = 10)
    private BigDecimal purityFactor;

    @Column(name = "fine_weight", nullable = false, precision = 19, scale = 4)
    private BigDecimal fineWeight;

    // Optional job card reference tying the movement to a specific production order
    @Column(name = "job_card")
    private String jobCard;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
