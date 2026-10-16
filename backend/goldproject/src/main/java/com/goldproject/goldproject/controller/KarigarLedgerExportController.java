package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.service.KarigarLedgerExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/karigar-ledger")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class KarigarLedgerExportController {

    private final KarigarLedgerExportService karigarLedgerExportService;

    // Server-generated Excel export of the complete (unwindowed) transaction log for one
    // karigar's asset class, scoped to a date range — the UI's /entries endpoint only ever
    // returns the last 3 months for display, this is the real full-history download.
    @GetMapping("/accounts/{karigarId}/export")
    public ResponseEntity<byte[]> exportLedger(
            @PathVariable Long karigarId,
            @RequestParam String assetClass,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate) {
        KarigarLedgerExportService.ExportResult result =
                karigarLedgerExportService.exportLedger(karigarId, assetClass, startDate, endDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(result.filename()).build());
        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(result.bytes());
    }
}
