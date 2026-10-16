package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WagePerGramDTO {
    private String karigarName;
    private String karigarType; // "IN_HOUSE" or "OUTSOURCED"
    private Double totalWagePaid;
    private Double totalGramsProcessed;
    private Double wagePerGram;
    private Double targetWagePerGram;

    // "GREEN" (Below target), "AMBER" (Exactly at target), "RED" (Above target)
    private String performanceColorCode;
}