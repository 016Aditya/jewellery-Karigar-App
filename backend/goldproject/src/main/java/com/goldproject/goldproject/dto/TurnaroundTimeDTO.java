package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TurnaroundTimeDTO {
    private String karigarName;
    private Double averageTurnaroundDays;
    private Integer targetTatDays; // The agreed upon TAT
    private Long completedJobsCount;

    // "GREEN" (On Time), "AMBER" (1-3 days late), "RED" (3+ days late)
    private String performanceColorCode;
}