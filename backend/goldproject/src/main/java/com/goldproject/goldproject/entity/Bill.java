package com.goldproject.goldproject.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bills")
@Data
public class Bill {

    @Id
    private String id;

    @Column(nullable = false)
    private String type;

    @Column(name = "order_type", nullable = false)
    private String orderType;

    @Column(name = "bill_category")
    private String billCategory;

    @Column(name = "exchange_receipt")
    private String exchangeReceipt;

    @Column(nullable = false)
    private LocalDate date;

    // Used to sort "newest first" reliably — `date` alone is a plain calendar date and
    // can't distinguish multiple bills created the same day. Nullable so existing rows
    // (created before this column existed) don't break; they just sort after new ones.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String customer;

    private String phone;

    @Column(name = "lut_number")
    private String lutNumber;

    @Column(name = "iec_code")
    private String iecCode;

    @Column(name = "ad_code")
    private String adCode;

    @Column(name = "exchange_rate", precision = 19, scale = 4)
    private BigDecimal exchangeRate;

    @Column(name = "consignee_vat")
    private String consigneeVat;

    @Column(name = "port_of_loading")
    private String portOfLoading;

    @Column(name = "port_of_discharge")
    private String portOfDischarge;

    // Export-only shipping/customs fields (reference: SLS_Export_Invoice.pdf)
    private String incoterms;

    @Column(name = "mode_of_transport")
    private String modeOfTransport;

    @Column(name = "vessel_flight_no")
    private String vesselFlightNo;

    @Column(name = "bill_of_lading_no")
    private String billOfLadingNo;

    @Column(name = "shipping_bill_no")
    private String shippingBillNo;

    @Column(name = "let_export_order")
    private String letExportOrder;

    @Column(name = "packing_details")
    private String packingDetails;

    @Column(name = "gross_weight_packed", precision = 19, scale = 4)
    private BigDecimal grossWeightPacked;

    @Column(name = "country_of_origin")
    private String countryOfOrigin;

    @Column(name = "country_of_destination")
    private String countryOfDestination;

    @Column(name = "freight_charges", precision = 19, scale = 2)
    private BigDecimal freightCharges;

    @Column(name = "insurance_charges", precision = 19, scale = 2)
    private BigDecimal insuranceCharges;

    @Column(name = "consignee_address", columnDefinition = "TEXT")
    private String consigneeAddress;

    @Column(name = "consignee_country")
    private String consigneeCountry;

    // Multi-State (place-of-supply GST) fields — reference: SLS_MultiState_Bills.pdf
    @Column(name = "buyer_gstin")
    private String buyerGstin;

    @Column(name = "buyer_pan")
    private String buyerPan;

    @Column(name = "buyer_state")
    private String buyerState;

    @Column(name = "buyer_state_code")
    private String buyerStateCode;

    @Column(name = "is_sez")
    private Boolean isSez;

    @Column(name = "supply_type")
    private String supplyType;

    @Column(precision = 19, scale = 2)
    private BigDecimal cgst;

    @Column(precision = 19, scale = 2)
    private BigDecimal sgst;

    @Column(precision = 19, scale = 2)
    private BigDecimal igst;

    @Column(precision = 19, scale = 2)
    private BigDecimal utgst;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal total;

    @Column(precision = 19, scale = 2)
    private BigDecimal gst;

    @Column(nullable = false)
    private String status;

    @OneToMany(mappedBy = "bill", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BillItem> items = new ArrayList<>();

    public void addItem(BillItem item) {
        items.add(item);
        item.setBill(this);
    }
}