package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.KarigarAssetTotalsDTO;
import com.goldproject.goldproject.dto.KarigarLedgerEntryDTO;
import com.goldproject.goldproject.dto.KarigarLedgerSummaryDTO;
import com.goldproject.goldproject.dto.PurityOptionDTO;
import com.goldproject.goldproject.service.KarigarLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/karigar-ledger")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class KarigarLedgerController {

    private final KarigarLedgerService karigarLedgerService;

    @GetMapping("/purities")
    public ResponseEntity<List<PurityOptionDTO>> getPurityRegistry() {
        return ResponseEntity.ok(karigarLedgerService.getPurityRegistry());
    }

    @GetMapping("/accounts")
    public ResponseEntity<List<KarigarLedgerSummaryDTO>> getSummaries() {
        return ResponseEntity.ok(karigarLedgerService.getSummaries());
    }

    @GetMapping("/accounts/{karigarId}/entries")
    public ResponseEntity<List<KarigarLedgerEntryDTO>> getEntries(@PathVariable Long karigarId) {
        return ResponseEntity.ok(karigarLedgerService.getEntries(karigarId));
    }

    // Absolute, all-time balance/OUT/IN totals — always DB-computed, never derived from the
    // (windowed) /entries list above, so the UI's balance figures stay correct regardless
    // of how far back the transaction table itself is scoped to display.
    @GetMapping("/accounts/{karigarId}/totals")
    public ResponseEntity<List<KarigarAssetTotalsDTO>> getAccountTotals(@PathVariable Long karigarId) {
        return ResponseEntity.ok(karigarLedgerService.getAccountTotals(karigarId));
    }

    @PostMapping("/accounts/{karigarId}/entries")
    public ResponseEntity<KarigarLedgerEntryDTO> addEntry(
            @PathVariable Long karigarId,
            @RequestBody KarigarLedgerEntryDTO dto) {
        return new ResponseEntity<>(karigarLedgerService.addEntry(karigarId, dto), HttpStatus.CREATED);
    }

    @DeleteMapping("/accounts/{karigarId}/entries/{entryId}")
    public ResponseEntity<Void> deleteEntry(@PathVariable Long karigarId, @PathVariable Long entryId) {
        karigarLedgerService.deleteEntry(karigarId, entryId);
        return ResponseEntity.noContent().build();
    }
}
