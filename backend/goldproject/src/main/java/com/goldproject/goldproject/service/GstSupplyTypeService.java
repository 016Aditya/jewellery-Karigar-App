package com.goldproject.goldproject.service;

import com.goldproject.goldproject.config.CompanyProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

// Determines which GST components apply to a Multi-State bill by comparing the supplier's
// state (from CompanyProfile / application.properties) against the buyer's state — per
// SLS_MultiState_Bills.pdf's compliance reference table: same state = CGST+SGST, different
// state = IGST, Union Territory destination = CGST+UTGST, SEZ/LUT = zero-rated.
@Service
@RequiredArgsConstructor
public class GstSupplyTypeService {

    private final CompanyProfile companyProfile;

    // State codes 01-37 that are Union Territories per the reference table (Jammu &
    // Kashmir, Chandigarh, Delhi, Dadra & Nagar Haveli and Daman & Diu, Lakshadweep,
    // Puducherry, Andaman & Nicobar Islands, Ladakh, Other Territory).
    private static final Set<String> UNION_TERRITORY_CODES =
            Set.of("01", "04", "07", "25", "30", "33", "34", "36", "37");

    public String determineSupplyType(String buyerStateCode, boolean isSez) {
        if (isSez) {
            return "ZERO_RATED";
        }
        if (companyProfile.getStateCode().equals(buyerStateCode)) {
            return "INTRA_STATE";
        }
        if (UNION_TERRITORY_CODES.contains(buyerStateCode)) {
            return "UNION_TERRITORY";
        }
        return "INTER_STATE";
    }
}
