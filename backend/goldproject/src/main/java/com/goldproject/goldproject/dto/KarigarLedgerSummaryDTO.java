package com.goldproject.goldproject.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// One row of the Karigar Ledger main table — mirrors FullTimeKarigarDTO's shape but with
// per-asset-class fine-metal holdings instead of a monthly salary.
@Data
public class KarigarLedgerSummaryDTO {
    private Long karigarId;
    private String name;
    private String contactNumber;
    private String karigarType;
    private LocalDate joiningDate;
    private Boolean isActive;
    private BigDecimal totalGoldHolding;
    private BigDecimal totalSilverHolding;
    private BigDecimal totalPlatinumHolding;
    private List<KarigarHoldingDTO> holdings;
}
