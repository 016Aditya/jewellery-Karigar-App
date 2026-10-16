package com.goldproject.goldproject.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class BillDTO {
    private String id;
    private String type;
    private String orderType;
    private String billCategory;
    private String exchangeReceipt;
    private LocalDate date;
    private String customer;
    private String phone;

    private String lutNumber;
    private String iecCode;
    private String adCode;
    private BigDecimal exchangeRate;
    private String consigneeVat;
    private String portOfLoading;
    private String portOfDischarge;

    // Export-only shipping/customs fields (reference: SLS_Export_Invoice.pdf)
    private String incoterms;
    private String modeOfTransport;
    private String vesselFlightNo;
    private String billOfLadingNo;
    private String shippingBillNo;
    private String letExportOrder;
    private String packingDetails;
    private BigDecimal grossWeightPacked;
    private String countryOfOrigin;
    private String countryOfDestination;
    private BigDecimal freightCharges;
    private BigDecimal insuranceCharges;
    private String consigneeAddress;
    private String consigneeCountry;

    // Multi-State (place-of-supply GST) fields — reference: SLS_MultiState_Bills.pdf
    private String buyerGstin;
    private String buyerPan;
    private String buyerState;
    private String buyerStateCode;
    private Boolean isSez;
    private String supplyType; // INTRA_STATE | INTER_STATE | UNION_TERRITORY | ZERO_RATED
    private BigDecimal cgst;
    private BigDecimal sgst;
    private BigDecimal igst;
    private BigDecimal utgst;

    private BigDecimal total;
    private BigDecimal gst;
    private String status;

    private List<BillItemDTO> items;
}
