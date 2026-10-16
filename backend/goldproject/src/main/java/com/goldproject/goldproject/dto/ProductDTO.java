package com.goldproject.goldproject.dto;

import lombok.Data;

import java.util.List;

@Data
public class ProductDTO {
    private Long id;
    private String name;
    private String code;
    private String img;
    private String purity;
    private Double weight;
    private Double makingPercent;
    private String description;

    // Abstracting the relation: We only need IDs for input, and Names for output
    private Long categoryId;
    private String categoryName;

    // Each catalogue row is one metal variant of a product design.
    // Output-only: which variant this row is, and which product it belongs to.
    private String metalType;
    private Long productId;

    // Input-only: full set of metals to create/keep for this product on create/update.
    private List<String> metalTypes;

    // --- Calculated Pricing Fields (per this row's metalType) ---
    private Double metalValue;
    private Double makingAmount;
    private Double gstAmount;
    private Double mrp;

}