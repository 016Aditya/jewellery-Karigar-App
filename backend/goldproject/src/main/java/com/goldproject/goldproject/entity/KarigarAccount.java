package com.goldproject.goldproject.entity;

import com.goldproject.goldproject.enums.LedgerAssetClass;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

// One row per (karigar, asset class) — a karigar can simultaneously hold a Gold balance
// and a Silver balance, but those two never net against each other (Asset Class Isolation
// Policy). fineBalance is always expressed in pure/fine metal terms, never gross alloy
// weight: positive means the karigar currently owes this much fine metal to the facility.
@Entity
@Table(
        name = "karigar_accounts",
        uniqueConstraints = @UniqueConstraint(columnNames = {"karigar_id", "asset_class"})
)
@Data
public class KarigarAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "karigar_id", nullable = false)
    private FullTimeKarigar karigar;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_class", nullable = false)
    private LedgerAssetClass assetClass;

    @Column(name = "fine_balance", nullable = false, precision = 19, scale = 4)
    private BigDecimal fineBalance = BigDecimal.ZERO;
}
