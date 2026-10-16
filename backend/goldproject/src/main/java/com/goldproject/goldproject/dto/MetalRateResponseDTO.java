package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MetalRateResponseDTO {
    private String metalType;
    private Double currentRate;
    private Double percentageChange;
}
