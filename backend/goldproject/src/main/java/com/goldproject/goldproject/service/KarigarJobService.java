package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.KarigarJobDTO;
import com.goldproject.goldproject.dto.PurityOptionDTO;
import com.goldproject.goldproject.entity.BillItem;
import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.entity.KarigarJob;
import com.goldproject.goldproject.enums.LedgerAssetClass;
import com.goldproject.goldproject.enums.LedgerEntryType;
import com.goldproject.goldproject.repository.BillItemRepository;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import com.goldproject.goldproject.repository.KarigarJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KarigarJobService {

    private static final int FINE_SCALE = 4;

    private final KarigarJobRepository karigarJobRepository;
    private final BillItemRepository billItemRepository;
    private final FullTimeKarigarRepository fullTimeKarigarRepository;
    private final KarigarLedgerService karigarLedgerService;

    public List<KarigarJobDTO> getAllJobs() {
        return karigarJobRepository.findAllByOrderByIdDesc()
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public KarigarJobDTO assignJob(KarigarJobDTO dto) {
        BillItem item = billItemRepository.findById(dto.getBillItemId())
                .orElseThrow(() -> new RuntimeException("Bill Item not found with ID: " + dto.getBillItemId()));

        // A bill item's quantity can be split across multiple job cards — e.g. 1 of 3
        // units to this karigar, the remaining 2 to another. Block the assignment only
        // once the item's full quantity has actually been spoken for, not on the mere
        // existence of a prior job card against the same item.
        int totalAvailable = item.getQuantity() != null ? item.getQuantity() : 1;
        int alreadyAssigned = karigarJobRepository.sumAssignedQuantityForBillItem(dto.getBillItemId());
        int remaining = totalAvailable - alreadyAssigned;
        int requestedQuantity = dto.getQuantity() != null ? dto.getQuantity() : 1;

        if (remaining <= 0) {
            throw new DuplicateAssignmentException(
                    "This item's full quantity (" + totalAvailable + ") is already assigned across existing job cards.");
        }
        if (requestedQuantity > remaining) {
            throw new DuplicateAssignmentException(
                    "Only " + remaining + " of " + totalAvailable
                            + " unit(s) remain unassigned for this item — reduce the quantity or choose a different item.");
        }

        // Strong link: the karigar must exist in the master table — karigarName is derived
        // from it, never trusted as free text from the client.
        FullTimeKarigar karigar = fullTimeKarigarRepository.findById(dto.getKarigarId())
                .orElseThrow(() -> new RuntimeException("Karigar not found with ID: " + dto.getKarigarId()));

        // The metal issued for this job is drawn from the karigar's existing ledger
        // balance (not newly issued bulk stock) — validate BEFORE any write happens.
        // BigDecimal end to end: gross weight -> purity factor -> fine weight, compared
        // directly against the karigar's fine balance.
        PurityOptionDTO purityOption = karigarLedgerService.getPurityOption(dto.getGoldPurity());
        LedgerAssetClass assetClass = LedgerAssetClass.valueOf(purityOption.getAssetClass());
        BigDecimal requestedFineWeight = dto.getEstimatedMetalRequired()
                .multiply(purityOption.getFactor())
                .setScale(FINE_SCALE, RoundingMode.HALF_UP);
        BigDecimal currentBalance = karigarLedgerService.getCurrentBalance(dto.getKarigarId(), assetClass);

        if (requestedFineWeight.compareTo(currentBalance) > 0) {
            throw new InsufficientBalanceException(
                    "Insufficient " + assetClass + " balance for " + karigar.getName() + ": requires "
                            + requestedFineWeight + "g fine, but only " + currentBalance + "g available. "
                            + "Issue more metal to this karigar in the Karigar Gold Ledger before assigning this job.");
        }

        // Server-side mirror of the UI's "gold required must exceed quantity" rule —
        // a batch of N pieces cannot plausibly be built from N grams or less.
        int quantity = dto.getQuantity() != null ? dto.getQuantity() : 1;
        if (dto.getEstimatedMetalRequired().compareTo(BigDecimal.valueOf(quantity)) <= 0) {
            throw new InsufficientBalanceException(
                    "Estimated metal required (" + dto.getEstimatedMetalRequired()
                            + "g) must be greater than the job quantity (" + quantity + ").");
        }

        KarigarJob job = new KarigarJob();
        // Instant.now().toEpochMilli() is monotonically increasing and unique per
        // millisecond — unlike the old random 4-digit suffix, this can't collide even
        // under concurrent assignment requests.
        job.setJobId("JOB-" + java.time.Instant.now().toEpochMilli());
        job.setKarigar(karigar);
        job.setKarigarName(karigar.getName());
        job.setWorkType(dto.getWorkType());
        job.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 1);
        job.setEstimatedMetalRequired(dto.getEstimatedMetalRequired());
        job.setGoldPurity(dto.getGoldPurity());
        job.setExpectedWastagePercent(dto.getExpectedWastagePercent());
        job.setGrossWages(dto.getGrossWages());
        // Advance payment — default to zero if not provided
        job.setAdvancePayment(dto.getAdvancePayment() != null ? dto.getAdvancePayment() : BigDecimal.ZERO);
        job.setDateIssued(LocalDate.now());
        job.setStatus("Assigned");
        job.setBillItem(item);

        KarigarJob saved = karigarJobRepository.save(job);

        // Because it's my order, the gold physically stays committed to this specific job
        // instead of the karigar's general uncommitted balance — recorded as USED_IN_ORDER,
        // which behaves exactly like a RETURN mathematically (decreases the balance).
        karigarLedgerService.recordEntry(
                karigar.getId(),
                dto.getGoldPurity(),
                dto.getEstimatedMetalRequired(),
                LedgerEntryType.USED_IN_ORDER,
                LocalDate.now(),
                saved.getJobId(),
                "Metal Utilised to build item in Job " + saved.getJobId());

        return mapToDTO(saved);
    }

    @Transactional
    public KarigarJobDTO receiveJob(Long id, KarigarJobDTO dto) {
        KarigarJob job = karigarJobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found with ID: " + id));

        // The karigar can't hand back more fine metal as scrap than they currently hold —
        // validate BEFORE any write happens, same pattern as assignJob's balance check.
        // No job update and no ledger entry is persisted if this fails.
        if (dto.getScrapReturned() != null && dto.getScrapReturned().compareTo(BigDecimal.ZERO) > 0
                && job.getKarigar() != null && job.getGoldPurity() != null) {
            PurityOptionDTO purityOption = karigarLedgerService.getPurityOption(job.getGoldPurity());
            LedgerAssetClass assetClass = LedgerAssetClass.valueOf(purityOption.getAssetClass());
            BigDecimal scrapFineWeight = dto.getScrapReturned()
                    .multiply(purityOption.getFactor())
                    .setScale(FINE_SCALE, RoundingMode.HALF_UP);
            BigDecimal currentBalance = karigarLedgerService.getCurrentBalance(job.getKarigar().getId(), assetClass);

            if (scrapFineWeight.compareTo(currentBalance) > 0) {
                throw new InsufficientBalanceException(
                        "Scrap returned (" + scrapFineWeight + "g fine) exceeds " + job.getKarigarName()
                                + "'s current " + assetClass + " balance of " + currentBalance
                                + "g — they cannot return more metal than they currently hold.");
            }
        }

        job.setFinishedWeight(dto.getFinishedWeight());
        job.setScrapReturned(dto.getScrapReturned());
        job.setDateReturned(LocalDate.now());
        job.setStatus("Completed");

        KarigarJob saved = karigarJobRepository.save(job);

        // Whatever scrap (fine gold or otherwise) the karigar physically hands back for
        // this job is logged as SCRAP_RETURNED_FOR_ORDER — same math as RETURN (decreases
        // balance).
        if (saved.getScrapReturned() != null && saved.getScrapReturned().compareTo(BigDecimal.ZERO) > 0
                && saved.getKarigar() != null && saved.getGoldPurity() != null) {
            karigarLedgerService.recordEntry(
                    saved.getKarigar().getId(),
                    saved.getGoldPurity(),
                    saved.getScrapReturned(),
                    LedgerEntryType.SCRAP_RETURNED_FOR_ORDER,
                    LocalDate.now(),
                    saved.getJobId(),
                    "Returned in scrap for Job " + saved.getJobId());
        }

        return mapToDTO(saved);
    }

    private KarigarJobDTO mapToDTO(KarigarJob job) {
        KarigarJobDTO dto = new KarigarJobDTO();
        dto.setId(job.getId());
        dto.setJobId(job.getJobId());
        dto.setKarigarName(job.getKarigarName());
        if (job.getKarigar() != null) {
            dto.setKarigarId(job.getKarigar().getId());
            dto.setKarigarType(job.getKarigar().getKarigarType() != null
                    ? job.getKarigar().getKarigarType().name()
                    : null);
        }
        dto.setWorkType(job.getWorkType());
        dto.setQuantity(job.getQuantity());
        dto.setEstimatedMetalRequired(job.getEstimatedMetalRequired());
        dto.setGoldPurity(job.getGoldPurity());
        dto.setExpectedWastagePercent(job.getExpectedWastagePercent());
        dto.setGrossWages(job.getGrossWages());
        dto.setAdvancePayment(job.getAdvancePayment());   // mapped here
        dto.setDateIssued(job.getDateIssued());
        dto.setDateReturned(job.getDateReturned());
        dto.setFinishedWeight(job.getFinishedWeight());
        dto.setScrapReturned(job.getScrapReturned());
        dto.setStatus(job.getStatus());

        if (job.getBillItem() != null) {
            dto.setBillItemId(job.getBillItem().getId());
            dto.setBillId(job.getBillItem().getBill().getId());
            dto.setItemCode(job.getBillItem().getCode());
            dto.setItemName(job.getBillItem().getName());
        }
        return dto;
    }
}
