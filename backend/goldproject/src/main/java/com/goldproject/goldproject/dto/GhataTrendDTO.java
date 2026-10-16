package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GhataTrendDTO {
    private String karigarName;
    private Integer year;
    private Integer month;

    // The calculated Ghata value for this specific month
    // Positive = Excess loss (Red/Amber)
    // Negative = Over-returning metal (Green)
    private Double totalGhata;
}