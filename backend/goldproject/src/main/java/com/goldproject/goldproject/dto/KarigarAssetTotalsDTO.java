package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;

// All-time, DB-absolute totals for one karigar's asset class — independent of whatever
// rolling window the /entries endpoint currently returns for display, so the UI's
// balance/settlement figures never drift from the ledger's true running total.
@Data
@AllArgsConstructor
public class KarigarAssetTotalsDTO {
    private String assetClass;
    private BigDecimal fineBalance;
    private BigDecimal totalIssuedFine;
    private BigDecimal totalReturnedFine;
}
