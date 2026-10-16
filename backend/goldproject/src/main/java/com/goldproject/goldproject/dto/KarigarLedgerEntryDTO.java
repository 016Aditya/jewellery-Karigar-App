package com.goldproject.goldproject.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class KarigarLedgerEntryDTO {
    private Long id;
    private Long karigarId;
    private String assetClass;

    // Input fields for creating a new entry
    private String entryType;   // "ISSUE" or "RETURN"
    private LocalDate date;
    private String purity;      // purity registry key, e.g. "22K", "SILVER_925"
    private BigDecimal grossWeight;
    private String jobCard;
    private String description;

    // Output-only, computed at creation time
    private BigDecimal purityFactor;
    private BigDecimal fineWeight;
}
