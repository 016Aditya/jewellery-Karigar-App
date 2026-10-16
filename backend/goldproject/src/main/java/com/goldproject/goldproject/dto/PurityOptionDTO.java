package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

// One row of the Master Precious Metal Purity Configuration Registry (doc section 7.1) —
// exposed so the frontend never hardcodes purity keys/labels/factors itself.
@Data
@AllArgsConstructor
public class PurityOptionDTO {
    private String key;
    private String label;
    private String assetClass;
    private BigDecimal factor;
}
