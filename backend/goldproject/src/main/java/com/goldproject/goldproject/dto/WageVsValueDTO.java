package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WageVsValueDTO {
    private String karigarName;
    private String karigarType; // "IN_HOUSE" or "OUTSOURCED"

    private Double totalWagesPaid; // The Amber Bar
    private Double totalJobValue;  // The Gold Bar

    private Double netProfit;      // totalJobValue - totalWagesPaid

    // "RED" if wages > job value, else "AMBER"
    private String wagesBarColor;
}