package com.goldproject.goldproject.entity;

import com.goldproject.goldproject.enums.MetalType;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "bill_items")
@Data
public class BillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(nullable = false)
    private String name;

    private String code;

    @Column(nullable = false)
    private String purity;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal weight; // This represents total weight (new + old)

    @Column(nullable = false)
    private Integer quantity;

    // Which metal this line item is (Domestic billing only for now); null for legacy
    // rows and for other bill types (Export/Purchase/Repair) not yet metal-aware.
    @Enumerated(EnumType.STRING)
    @Column(name = "metal_type")
    private MetalType metalType;

    // Set when this line was added from the Catalogue (vs. a custom manual entry) —
    // the clean signal the server uses to decide whether to trust the given price
    // as-is or recompute it from scratch.
    @Column(name = "product_id")
    private Long productId;

    // --- New Audit Fields ---
    @Column(name = "old_weight", precision = 19, scale = 4)
    private BigDecimal oldWeight;

    @Column(name = "old_price", precision = 19, scale = 2)
    private BigDecimal oldPrice;

    @Column(name = "gst_percent", precision = 7, scale = 3)
    private BigDecimal gstPercent;

    // Multi-State bills tax Metal/Making/Stone at different rates — user-editable on the
    // Multi-State form (default 3% / 5% / 0.25%); unused for other bill types.
    @Column(name = "metal_gst_percent", precision = 7, scale = 3)
    private BigDecimal metalGstPercent;

    @Column(name = "making_gst_percent", precision = 7, scale = 3)
    private BigDecimal makingGstPercent;

    @Column(name = "stone_gst_percent", precision = 7, scale = 3)
    private BigDecimal stoneGstPercent;

    @Column(name = "hsn_code")
    private String hsnCode;

    // --- Advanced Valuation Fields ---
    // Live metal rate at the time of transaction
    @Column(precision = 19, scale = 4)
    private BigDecimal rate;

    // For Domestic & Export (Making Charges)
    @Column(name = "making_percent", precision = 7, scale = 3)
    private BigDecimal makingPercent;

    // Separating Stone value from Metal value for accurate GST calculation
    @Column(name = "stone_value", precision = 19, scale = 2)
    private BigDecimal stoneValue;

    // For Purchase / Buy-back (Melting loss / Wastage deduction)
    @Column(name = "wastage_percent", precision = 7, scale = 3)
    private BigDecimal wastagePercent;

    // For Repair Services (Taxed at 18%)
    @Column(name = "labor_amount", precision = 19, scale = 2)
    private BigDecimal laborAmount;

    // Computed total in INR for this specific line item
    @Column(precision = 19, scale = 2)
    private BigDecimal mrp;

    // Computed total in USD for Export invoices
    @Column(name = "fob_usd", precision = 19, scale = 2)
    private BigDecimal fobUsd;

    // Add this to your existing BillItem.java
    @OneToOne(mappedBy = "billItem", cascade = CascadeType.ALL, orphanRemoval = true)
    private ItemTracking tracking;

}
