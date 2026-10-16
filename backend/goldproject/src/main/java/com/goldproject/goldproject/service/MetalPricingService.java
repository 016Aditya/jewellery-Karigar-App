package com.goldproject.goldproject.service;

import com.goldproject.goldproject.entity.MetalRate;
import com.goldproject.goldproject.enums.MetalType;
import com.goldproject.goldproject.repository.MetalRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

// Single source of truth for metal pricing inputs — which metal rate a given metal type
// bills against, and its purity factor. Shared by CatalogueService (product listing) and
// BillService (bill creation) so the two can never drift onto different factor tables —
// which had already happened: CatalogueService used raw doubles and had no Silver/Platinum
// handling (both silently fell through to the 22K gold default).
@Service
@RequiredArgsConstructor
public class MetalPricingService {

    private final MetalRateRepository metalRateRepository;

    // Rose/White/Yellow Gold are gold alloys — per the client's billing guide they're
    // always priced off the GOLD rate (with the same purity factor table), not their own
    // Catalogue rate.
    private static final Set<MetalType> GOLD_FAMILY =
            EnumSet.of(MetalType.GOLD, MetalType.ROSE_GOLD, MetalType.WHITE_GOLD, MetalType.YELLOW_GOLD);

    private static final Map<String, BigDecimal> GOLD_PURITY_FACTORS = Map.of(
            // The shop's "24K" stock is actually 995 fineness (not 999 pure) — this is the
            // real factor used for every calculation, even though the customer-facing label
            // everywhere (bills, PDFs, catalogue) just reads "24K".
            "24K", new BigDecimal("0.995"),
            "22K", new BigDecimal("0.916"),
            "18K", new BigDecimal("0.750"),
            "14K", new BigDecimal("0.583"),
            "9K", new BigDecimal("0.375")
    );
    private static final BigDecimal DEFAULT_GOLD_FACTOR = GOLD_PURITY_FACTORS.get("22K");
    private static final BigDecimal PLATINUM_FACTOR = new BigDecimal("0.950");

    public BigDecimal getLatestRate(MetalType metalType) {
        MetalType rateType = GOLD_FAMILY.contains(metalType) ? MetalType.GOLD : metalType;
        return metalRateRepository.findTopByMetalTypeOrderByCreatedAtDesc(rateType)
                .map(MetalRate::getRate)
                .map(BigDecimal::valueOf)
                .orElse(BigDecimal.ZERO);
    }

    public BigDecimal getPurityFactor(MetalType metalType, String purity) {
        if (metalType == MetalType.SILVER) return BigDecimal.ONE; // billed at rate directly, no purity factor
        if (metalType == MetalType.PLATINUM) return PLATINUM_FACTOR;
        return GOLD_PURITY_FACTORS.getOrDefault(purity, DEFAULT_GOLD_FACTOR);
    }
}
