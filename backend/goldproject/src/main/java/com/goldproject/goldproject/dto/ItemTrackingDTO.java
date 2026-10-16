package com.goldproject.goldproject.dto;

import lombok.Data;

@Data
public class ItemTrackingDTO {
    private Long itemId;
    private String billId;
    private String customer;
    private String itemName;
    private Double amount;

    // Tracking specific fields
    private String status;
    private Integer progress;
    private String assigned;
    private String eta;
}