package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KarigarWagePayoutDTO {
    private Integer year;
    private Integer month;
    private String monthName;
    private String karigarName;
    private String karigarType; // "IN_HOUSE" or "OUTSOURCED"

    // For In-House: Fixed Monthly Salary
    // For Outsourced: Sum of gross wages for jobs completed this month
    private Double wagesPaid;
}