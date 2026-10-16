package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TopSellingItemDTO {
    private String month;       // "2026-02"
    private String monthLabel;  // "Feb 2026"
    private String metalType;   // GOLD, SILVER, PLATINUM
    private String productName;
    private long quantitySold;
}
