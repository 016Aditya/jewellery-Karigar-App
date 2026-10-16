package com.goldproject.goldproject.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BillItemDTO {
    private Long id;

    // Basic Item Info
    private String name;
    private String code;
    private String purity;
    private BigDecimal weight;
    private Integer quantity;

    // Which metal this line is, and which Catalogue product it came from (if any —
    // null means a custom/manual entry). Domestic billing only for now.
    private String metalType;
    private Long productId;

    // Audit Fields
    private BigDecimal oldWeight;
    private BigDecimal oldPrice;
    private BigDecimal gstPercent;

    // Multi-State bills tax Metal/Making/Stone at different rates (reference:
    // SLS_MultiState_Bills.pdf — Metal 3%, Making 5%, Diamond/Stone 0.25%). User-editable
    // on the Multi-State form; null/unused for other bill types (they use gstPercent above).
    private BigDecimal metalGstPercent;
    private BigDecimal makingGstPercent;
    private BigDecimal stoneGstPercent;
    private String hsnCode;

    // Valuation Factors
    private BigDecimal rate;           // Live metal rate applied
    private BigDecimal makingPercent;  // Making charge % for domestic/export
    private BigDecimal stoneValue;     // Separate stone value
    private BigDecimal wastagePercent; // Wastage deduction for buy-backs
    private BigDecimal laborAmount;    // Labor charges for repairs

    // Computed Totals
    private BigDecimal fobUsd;         // USD value for exports
    private BigDecimal mrp;            // Final INR value for the line item
}
