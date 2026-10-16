package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
public class KarigarHoldingDTO {
    private String assetClass;
    private BigDecimal fineBalance;
}
