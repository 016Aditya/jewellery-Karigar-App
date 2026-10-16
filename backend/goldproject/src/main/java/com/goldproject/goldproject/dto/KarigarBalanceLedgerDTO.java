package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KarigarBalanceLedgerDTO {
    private String karigarName;
    private String karigarType; // "IN_HOUSE" or "OUTSOURCED"

    private Double wagesEarned;   // Amount we owe them (Salary or sum of completed piece-rates)
    private Double advanceGiven;  // Amount paid upfront
    private Double netBalance;    // wagesEarned - advanceGiven

    // "GREEN" (Positive balance: We owe them / Settled)
    // "RED" (Negative balance: They took more advance than they earned)
    private String balanceColorCode;
}