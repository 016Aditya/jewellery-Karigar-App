package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.KarigarAssetTotalsDTO;
import com.goldproject.goldproject.dto.KarigarHoldingDTO;
import com.goldproject.goldproject.dto.KarigarLedgerEntryDTO;
import com.goldproject.goldproject.dto.KarigarLedgerSummaryDTO;
import com.goldproject.goldproject.dto.PurityOptionDTO;
import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.entity.KarigarAccount;
import com.goldproject.goldproject.entity.KarigarLedgerEntry;
import com.goldproject.goldproject.enums.LedgerAssetClass;
import com.goldproject.goldproject.enums.LedgerEntryType;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import com.goldproject.goldproject.repository.KarigarAccountRepository;
import com.goldproject.goldproject.repository.KarigarLedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KarigarLedgerService {

    private final FullTimeKarigarRepository fullTimeKarigarRepository;
    private final KarigarAccountRepository karigarAccountRepository;
    private final KarigarLedgerEntryRepository karigarLedgerEntryRepository;

    private static final int FINE_SCALE = 4;

    // Master Precious Metal Purity Configuration Registry (doc section 7.1). Factors are
    // computed as exact fractions rather than hardcoded rounded decimals — e.g. 22K is
    // 22/24 (0.916667), not a flat 0.916 — per the FAQ's explicit guidance to avoid
    // accumulated rounding loss over many transactions.
    private static final Map<String, PurityOptionDTO> PURITY_REGISTRY = buildRegistry();

    private static Map<String, PurityOptionDTO> buildRegistry() {
        Map<String, PurityOptionDTO> map = new LinkedHashMap<>();
        // The shop's "24K" stock is actually 995 fineness, not 999/1000 pure — the ledger
        // tracks fine gold using the real 0.995 factor even though every order/bill/PDF
        // still labels the item plain "24K".
        map.put("24K", new PurityOptionDTO("24K", "24K (995)", "GOLD", new BigDecimal("0.9950000000")));
        map.put("22K", new PurityOptionDTO("22K", "22K (916)", "GOLD", fraction(22, 24)));
        map.put("18K_YELLOW", new PurityOptionDTO("18K_YELLOW", "18K Yellow (750)", "GOLD", fraction(18, 24)));
        map.put("18K_ROSE", new PurityOptionDTO("18K_ROSE", "Rose Gold (750)", "GOLD", fraction(18, 24)));
        map.put("18K_WHITE", new PurityOptionDTO("18K_WHITE", "White Gold (750)", "GOLD", fraction(18, 24)));
        map.put("14K", new PurityOptionDTO("14K", "14K (585)", "GOLD", fraction(14, 24)));
        map.put("SILVER_925", new PurityOptionDTO("SILVER_925", "Silver 925", "SILVER", new BigDecimal("0.9250000000")));
        map.put("SILVER_999", new PurityOptionDTO("SILVER_999", "Silver 999 Pure", "SILVER", new BigDecimal("0.9990000000")));
        // Matches the "1000" purity option in the Catalogue's Silver/Platinum item forms —
        // 1000 fineness is fully pure metal, so the factor is exactly 1.
        map.put("SILVER_1000", new PurityOptionDTO("SILVER_1000", "Silver 1000 Pure", "SILVER", new BigDecimal("1.0000000000")));
        map.put("PT_950", new PurityOptionDTO("PT_950", "Platinum 950", "PLATINUM", new BigDecimal("0.9500000000")));
        map.put("PT_1000", new PurityOptionDTO("PT_1000", "Platinum 1000 Pure", "PLATINUM", new BigDecimal("1.0000000000")));
        return map;
    }

    private static BigDecimal fraction(int numerator, int denominator) {
        return BigDecimal.valueOf(numerator)
                .divide(BigDecimal.valueOf(denominator), 10, RoundingMode.HALF_UP);
    }

    public List<PurityOptionDTO> getPurityRegistry() {
        return List.copyOf(PURITY_REGISTRY.values());
    }

    public PurityOptionDTO getPurityOption(String key) {
        PurityOptionDTO option = PURITY_REGISTRY.get(key);
        if (option == null) {
            throw new RuntimeException("Unknown purity key: " + key);
        }
        return option;
    }

    // Current fine balance for one karigar's asset class — zero if no account exists yet
    // (i.e. nothing has ever been issued to them in that metal).
    public BigDecimal getCurrentBalance(Long karigarId, LedgerAssetClass assetClass) {
        return karigarAccountRepository.findByKarigarIdAndAssetClass(karigarId, assetClass)
                .map(KarigarAccount::getFineBalance)
                .orElse(BigDecimal.ZERO);
    }

    // One row per karigar, with their current fine-metal holdings broken out by asset
    // class (Gold/Silver/Platinum) — powers the ledger's main table. The three explicit
    // total*Holding fields are read straight off FullTimeKarigar (denormalized, kept in
    // sync by addEntry/deleteEntry below); the `holdings` list is kept too for the detail screen.
    public List<KarigarLedgerSummaryDTO> getSummaries() {
        Map<Long, List<KarigarAccount>> accountsByKarigar = karigarAccountRepository.findAllWithKarigar()
                .stream()
                .collect(Collectors.groupingBy(a -> a.getKarigar().getId()));

        return fullTimeKarigarRepository.findAll().stream()
                .map(k -> {
                    KarigarLedgerSummaryDTO dto = new KarigarLedgerSummaryDTO();
                    dto.setKarigarId(k.getId());
                    dto.setName(k.getName());
                    dto.setContactNumber(k.getContactNumber());
                    dto.setKarigarType(k.getKarigarType() != null ? k.getKarigarType().name() : null);
                    dto.setJoiningDate(k.getJoiningDate());
                    dto.setIsActive(k.getIsActive());
                    dto.setTotalGoldHolding(k.getTotalGoldHolding());
                    dto.setTotalSilverHolding(k.getTotalSilverHolding());
                    dto.setTotalPlatinumHolding(k.getTotalPlatinumHolding());
                    List<KarigarHoldingDTO> holdings = accountsByKarigar
                            .getOrDefault(k.getId(), List.of())
                            .stream()
                            .map(a -> new KarigarHoldingDTO(a.getAssetClass().name(), a.getFineBalance()))
                            .collect(Collectors.toList());
                    dto.setHoldings(holdings);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<KarigarLedgerEntryDTO> getEntries(Long karigarId) {
        java.time.LocalDate since = java.time.LocalDate.now().minusMonths(3);
        return karigarLedgerEntryRepository.findByKarigarIdSinceOrderByDateDesc(karigarId, since).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // Absolute, all-time balance/OUT/IN totals per asset class for one karigar — computed
    // straight from the DB (current account balance + full ledger history), independent of
    // the 3-month display window that getEntries() above is scoped to. This is what the
    // UI's balance cards and Settlement Engine must read from, so they never drift out of
    // sync with the true ledger just because older transactions have scrolled out of view.
    public List<KarigarAssetTotalsDTO> getAccountTotals(Long karigarId) {
        Map<LedgerAssetClass, BigDecimal> balanceByClass = karigarAccountRepository.findByKarigarId(karigarId)
                .stream()
                .collect(Collectors.toMap(KarigarAccount::getAssetClass, KarigarAccount::getFineBalance));

        Map<LedgerAssetClass, BigDecimal> issuedByClass = new java.util.HashMap<>();
        Map<LedgerAssetClass, BigDecimal> returnedByClass = new java.util.HashMap<>();
        for (Object[] row : karigarLedgerEntryRepository.sumFineWeightByAssetClassAndType(karigarId)) {
            LedgerAssetClass assetClass = (LedgerAssetClass) row[0];
            LedgerEntryType entryType = (LedgerEntryType) row[1];
            BigDecimal sum = (BigDecimal) row[2];
            if (entryType == LedgerEntryType.ISSUE) {
                issuedByClass.merge(assetClass, sum, BigDecimal::add);
            } else {
                returnedByClass.merge(assetClass, sum, BigDecimal::add);
            }
        }

        return java.util.Arrays.stream(LedgerAssetClass.values())
                .map(assetClass -> new KarigarAssetTotalsDTO(
                        assetClass.name(),
                        balanceByClass.getOrDefault(assetClass, BigDecimal.ZERO),
                        issuedByClass.getOrDefault(assetClass, BigDecimal.ZERO),
                        returnedByClass.getOrDefault(assetClass, BigDecimal.ZERO)))
                .collect(Collectors.toList());
    }

    @Transactional
    public KarigarLedgerEntryDTO addEntry(Long karigarId, KarigarLedgerEntryDTO dto) {
        LedgerEntryType entryType = LedgerEntryType.valueOf(dto.getEntryType());
        // The date is always stamped by the server, never trusted from the client — the
        // browser's local "today" computed via toISOString() drifts a day off in timezones
        // ahead of UTC (e.g. IST) for several hours after local midnight.
        return recordEntry(karigarId, dto.getPurity(), dto.getGrossWeight(), entryType,
                java.time.LocalDate.now(),
                dto.getJobCard(), dto.getDescription());
    }

    // Shared core for every balance-affecting ledger write — used directly by manual
    // ledger entries (addEntry above) AND by KarigarJobService for job-driven entries
    // (USED_IN_ORDER on assignment, SCRAP_RETURNED_FOR_ORDER on settlement). ISSUE is the
    // only entry type that increases the balance; every other type (RETURN,
    // USED_IN_ORDER, SCRAP_RETURNED_FOR_ORDER) decreases it identically.
    @Transactional
    public KarigarLedgerEntryDTO recordEntry(Long karigarId, String purityKey, BigDecimal grossWeight,
                                              LedgerEntryType entryType, java.time.LocalDate date,
                                              String jobCard, String description) {
        PurityOptionDTO purityOption = getPurityOption(purityKey);
        LedgerAssetClass assetClass = LedgerAssetClass.valueOf(purityOption.getAssetClass());

        KarigarAccount account = karigarAccountRepository
                .findByKarigarIdAndAssetClass(karigarId, assetClass)
                .orElseGet(() -> {
                    FullTimeKarigar karigar = fullTimeKarigarRepository.findById(karigarId)
                            .orElseThrow(() -> new RuntimeException("Karigar not found with ID: " + karigarId));
                    KarigarAccount newAccount = new KarigarAccount();
                    newAccount.setKarigar(karigar);
                    newAccount.setAssetClass(assetClass);
                    newAccount.setFineBalance(BigDecimal.ZERO);
                    return newAccount;
                });

        BigDecimal fineWeight = grossWeight
                .multiply(purityOption.getFactor())
                .setScale(FINE_SCALE, RoundingMode.HALF_UP);

        BigDecimal delta = entryType == LedgerEntryType.ISSUE ? fineWeight : fineWeight.negate();
        account.setFineBalance(account.getFineBalance().add(delta));
        KarigarAccount savedAccount = karigarAccountRepository.save(account);
        applyHoldingDelta(savedAccount.getKarigar(), assetClass, delta);

        KarigarLedgerEntry entry = new KarigarLedgerEntry();
        entry.setAccount(savedAccount);
        entry.setDate(date != null ? date : java.time.LocalDate.now());
        entry.setEntryType(entryType);
        entry.setPurity(purityKey);
        entry.setGrossWeight(grossWeight);
        entry.setPurityFactor(purityOption.getFactor());
        entry.setFineWeight(fineWeight);
        entry.setJobCard(jobCard);
        entry.setDescription(description);

        return mapToDTO(karigarLedgerEntryRepository.save(entry));
    }

    // The artifact's reference UI allows deleting a mis-entered row (rather than the
    // strictly-immutable ledger the reference doc describes) — deleting reverses exactly
    // the balance effect the entry originally applied, then removes it.
    @Transactional
    public void deleteEntry(Long karigarId, Long entryId) {
        KarigarLedgerEntry entry = karigarLedgerEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Ledger entry not found with ID: " + entryId));
        KarigarAccount account = entry.getAccount();
        if (!account.getKarigar().getId().equals(karigarId)) {
            throw new RuntimeException("Ledger entry does not belong to karigar: " + karigarId);
        }

        BigDecimal reversal = entry.getEntryType() == LedgerEntryType.ISSUE
                ? entry.getFineWeight().negate()
                : entry.getFineWeight();
        account.setFineBalance(account.getFineBalance().add(reversal));
        karigarAccountRepository.save(account);
        applyHoldingDelta(account.getKarigar(), account.getAssetClass(), reversal);

        karigarLedgerEntryRepository.delete(entry);
    }

    private void applyHoldingDelta(FullTimeKarigar karigar, LedgerAssetClass assetClass, BigDecimal delta) {
        switch (assetClass) {
            case GOLD -> karigar.setTotalGoldHolding(addFine(karigar.getTotalGoldHolding(), delta));
            case SILVER -> karigar.setTotalSilverHolding(addFine(karigar.getTotalSilverHolding(), delta));
            case PLATINUM -> karigar.setTotalPlatinumHolding(addFine(karigar.getTotalPlatinumHolding(), delta));
        }
        fullTimeKarigarRepository.save(karigar);
    }

    // All-BigDecimal end-to-end — gold weights matter down to milligram precision, and
    // repeated double addition/subtraction across many ledger entries would otherwise
    // accumulate floating-point rounding drift.
    private BigDecimal addFine(BigDecimal current, BigDecimal delta) {
        BigDecimal base = current != null ? current : BigDecimal.ZERO;
        return base.add(delta).setScale(FINE_SCALE, RoundingMode.HALF_UP);
    }

    private KarigarLedgerEntryDTO mapToDTO(KarigarLedgerEntry entry) {
        KarigarLedgerEntryDTO dto = new KarigarLedgerEntryDTO();
        dto.setId(entry.getId());
        dto.setKarigarId(entry.getAccount().getKarigar().getId());
        dto.setAssetClass(entry.getAccount().getAssetClass().name());
        dto.setEntryType(entry.getEntryType().name());
        dto.setDate(entry.getDate());
        dto.setPurity(entry.getPurity());
        dto.setGrossWeight(entry.getGrossWeight());
        dto.setPurityFactor(entry.getPurityFactor());
        dto.setFineWeight(entry.getFineWeight());
        dto.setJobCard(entry.getJobCard());
        dto.setDescription(entry.getDescription());
        return dto;
    }
}
