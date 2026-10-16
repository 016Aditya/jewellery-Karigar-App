package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WageTrendDTO {
    private String karigarName;
    private String karigarType; // "IN_HOUSE" or "OUTSOURCED"
    private Integer year;
    private Integer month;
    private String monthName;
    private Double wagePaid;
}