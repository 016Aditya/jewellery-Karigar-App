package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductivityScoreDTO {
    private String karigarName;

    // All scores are normalized to a 0-100 scale
    private Double onTimeScore;        // % of jobs delivered on or before TAT
    private Double metalAccuracyScore; // Accuracy of returned weight vs issued
    private Double jobVolumeScore;     // Volume against a monthly target
    private Double ghataControlScore;  // Ability to stay under wastage limits
    private Double reworkRateScore;    // % of jobs done right the first time
}