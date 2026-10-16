package com.goldproject.goldproject.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class MetalWeightChartDTO {
    private String karigarName;
    private Double totalIssuedGrams;
    private Double totalFinishedGrams;
    private Double totalScrapGrams;

    // Calculated fields
    private Double totalReturnedGrams;
    private Double allowedWastageGrams;
    private Double actualLossGrams;
    private Double excessLossGrams; // The "Ghata" - Highlight in RED if > 0

    public MetalWeightChartDTO(String karigarName, Double totalIssuedGrams,
                               Double totalFinishedGrams, Double totalScrapGrams,
                               Double allowedWastageGrams) {
        this.karigarName = karigarName;
        this.totalIssuedGrams = totalIssuedGrams != null ? totalIssuedGrams : 0.0;
        this.totalFinishedGrams = totalFinishedGrams != null ? totalFinishedGrams : 0.0;
        this.totalScrapGrams = totalScrapGrams != null ? totalScrapGrams : 0.0;
        this.allowedWastageGrams = allowedWastageGrams != null ? allowedWastageGrams : 0.0;

        // Calculations for the chart
        this.totalReturnedGrams = this.totalFinishedGrams + this.totalScrapGrams;
        this.actualLossGrams = this.totalIssuedGrams - this.totalReturnedGrams;

        // If actual loss is greater than allowed wastage, we have excess loss (ghata)
        this.excessLossGrams = Math.max(0, this.actualLossGrams - this.allowedWastageGrams);
    }
}