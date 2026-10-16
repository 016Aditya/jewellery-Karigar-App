package com.goldproject.goldproject.entity;

import com.goldproject.goldproject.enums.KarigarType;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

// Despite the class name (kept as-is to avoid a repo-wide rename), this table is now the
// single source of truth for every karigar — full-time AND contract-based — distinguished
// by karigarType. Only full-time karigars carry a monthlySalary.
@Entity
@Table(name = "full_time_karigars")
@Data
public class FullTimeKarigar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "address")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "karigar_type", nullable = false)
    private KarigarType karigarType = KarigarType.FULL_TIME;

    // Only meaningful for FULL_TIME karigars — contract-based karigars are paid per job
    // (via KarigarJob.grossWages) and have no fixed salary, so this is nullable.
    @Column(name = "monthly_salary")
    private Double monthlySalary=0.0;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // To track if they are currently employed

    // Denormalized fine-metal holdings, kept in sync by KarigarLedgerService whenever a
    // ledger entry is added or deleted — the KarigarAccount rows remain the source of
    // truth, these are just for fast display on the ledger's main table. BigDecimal
    // (not Double) since gold weights matter down to milligram precision (0.001g) and
    // repeated floating-point addition/subtraction across many entries would otherwise
    // accumulate rounding drift.
    @Column(name = "total_gold_holding", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalGoldHolding = BigDecimal.ZERO;

    @Column(name = "total_silver_holding", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalSilverHolding = BigDecimal.ZERO;

    @Column(name = "total_platinum_holding", nullable = false, precision = 19, scale = 4)
    private BigDecimal totalPlatinumHolding = BigDecimal.ZERO;
}
