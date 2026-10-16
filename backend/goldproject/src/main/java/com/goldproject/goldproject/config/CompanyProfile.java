package com.goldproject.goldproject.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

// Every piece of business-identity text that shows up on a printed invoice (GSTIN, BIS
// licence, address, bank details, ...) lives here and is bound from application.properties
// (prefix "company.") — so if any of it changes, it's a properties edit, not a code change.
// PdfGenerationService and GstSupplyTypeService both read from this single source.
@Component
@ConfigurationProperties(prefix = "company")
@Data
public class CompanyProfile {
    private String name = "SLS JEWELLERY";
    private String tagline = "Precious Metals • Diamonds • Custom Jewellery";
    private String gstin = "19ABCDE1234F1Z5";
    private String bisLicence = "WB-KOL-00123";
    private String pan = "ABCDE1234F";
    private String iecCode = "";
    private String addressLine = "12A, Rabindra Sarani, Kolkata - 700 007, West Bengal, India";
    private String phone = "+91-33-2214-XXXX";
    private String email = "billing@slsjewellery.in";
    private String exportEmail = "export@slsjewellery.in";
    private String stateName = "West Bengal";
    private String stateCode = "19";
    private String jurisdiction = "Kolkata";
    private String upiId = "slsjewellery@upi";
    private String bankName = "State Bank of India, Park Street Branch, Kolkata";
    private String bankAccount = "XXXX XXXX 9871";
    private String ifsc = "SBIN0001234";
    private String swift = "SBININBB";
}
