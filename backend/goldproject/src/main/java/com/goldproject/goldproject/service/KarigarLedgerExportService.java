package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.PurityOptionDTO;
import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.entity.KarigarLedgerEntry;
import com.goldproject.goldproject.enums.LedgerAssetClass;
import com.goldproject.goldproject.enums.LedgerEntryType;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import com.goldproject.goldproject.repository.KarigarLedgerEntryRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

// Builds the karigar ledger's full transaction-log Excel export. Deliberately server-side
// (Apache POI), not a client-side re-render of whatever's on screen — the export always
// walks the complete, unwindowed ledger history so the running balance column is correct
// even for a date range that starts long before the UI's 3-month display window.
@Service
@RequiredArgsConstructor
public class KarigarLedgerExportService {

    private static final int FINE_SCALE = 4;
    private static final DateTimeFormatter FILE_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final FullTimeKarigarRepository fullTimeKarigarRepository;
    private final KarigarLedgerEntryRepository karigarLedgerEntryRepository;
    private final KarigarLedgerService karigarLedgerService;

    public record ExportResult(byte[] bytes, String filename) {
    }

    public ExportResult exportLedger(Long karigarId, String assetClassRaw, LocalDate startDate, LocalDate endDate) {
        FullTimeKarigar karigar = fullTimeKarigarRepository.findById(karigarId)
                .orElseThrow(() -> new RuntimeException("Karigar not found with ID: " + karigarId));
        LedgerAssetClass assetClass = LedgerAssetClass.valueOf(assetClassRaw);
        String shortLabel = switch (assetClass) {
            case GOLD -> "FG";
            case SILVER -> "FS";
            case PLATINUM -> "FP";
        };

        // Walk the *entire* history chronologically to build a correct running balance,
        // then slice down to the requested date range for the rows actually written out.
        List<KarigarLedgerEntry> fullHistory =
                karigarLedgerEntryRepository.findByKarigarIdAndAssetClassOrderByDateAsc(karigarId, assetClass);

        BigDecimal running = BigDecimal.ZERO;
        int idx = 0;
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(assetClass.name() + " Ledger");
            CellStyle headerStyle = buildHeaderStyle(workbook, assetClass);
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd"));

            String[] headers = {
                    "#", "Date", "Type", "Purity", "Gross Wt (g)", "Purity Factor",
                    "Fine Conversion", "Fine Wt (g)", "Running Balance", "Job Card", "Description",
            };
            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (KarigarLedgerEntry e : fullHistory) {
                BigDecimal delta = e.getEntryType() == LedgerEntryType.ISSUE
                        ? e.getFineWeight() : e.getFineWeight().negate();
                running = running.add(delta).setScale(FINE_SCALE, java.math.RoundingMode.HALF_UP);

                boolean inRange = !e.getDate().isBefore(startDate) && !e.getDate().isAfter(endDate);
                if (!inRange) continue;

                idx++;
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(idx);

                Cell dateCell = row.createCell(1);
                dateCell.setCellValue(java.sql.Date.valueOf(e.getDate()));
                dateCell.setCellStyle(dateStyle);

                row.createCell(2).setCellValue(e.getEntryType().name());
                row.createCell(3).setCellValue(purityLabel(e.getPurity()));
                row.createCell(4).setCellValue(e.getGrossWeight().doubleValue());
                row.createCell(5).setCellValue(e.getPurityFactor().doubleValue());
                row.createCell(6).setCellValue(e.getGrossWeight() + " x " + e.getPurityFactor()
                        + " = " + e.getFineWeight() + " " + shortLabel);
                row.createCell(7).setCellValue(e.getFineWeight().doubleValue());
                row.createCell(8).setCellValue(running.abs() + " " + shortLabel + (running.signum() < 0 ? " (cr.)" : ""));
                row.createCell(9).setCellValue(e.getJobCard() != null ? e.getJobCard() : "-");
                row.createCell(10).setCellValue(e.getDescription() != null ? e.getDescription() : "");
            }

            for (int c = 0; c < headers.length; c++) {
                sheet.autoSizeColumn(c);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            String filename = "karigar-ledger-" + karigar.getName().replaceAll("[^a-zA-Z0-9]+", "-")
                    + "-" + assetClass.name() + "-" + startDate.format(FILE_DATE) + "-to-"
                    + endDate.format(FILE_DATE) + ".xlsx";
            return new ExportResult(out.toByteArray(), filename);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to build ledger export workbook", ex);
        }
    }

    private String purityLabel(String purityKey) {
        try {
            PurityOptionDTO option = karigarLedgerService.getPurityOption(purityKey);
            return option.getLabel();
        } catch (RuntimeException ex) {
            return purityKey;
        }
    }

    // Header row uses a solid accent fill with bold white text — deliberately not plain
    // white cells, per the requirement that the export "look" match the app's ledger UI.
    private CellStyle buildHeaderStyle(Workbook workbook, LedgerAssetClass assetClass) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(headerColor(assetClass));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private short headerColor(LedgerAssetClass assetClass) {
        // Matches the metal accent colors used across the ledger UI (getMetalColor.js).
        return switch (assetClass) {
            case GOLD -> IndexedColors.GOLD.getIndex();
            case SILVER -> IndexedColors.GREY_50_PERCENT.getIndex();
            case PLATINUM -> IndexedColors.LIGHT_BLUE.getIndex();
        };
    }
}
