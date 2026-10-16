package com.goldproject.goldproject.service;

import com.goldproject.goldproject.config.CompanyProfile;
import com.goldproject.goldproject.dto.BillDTO;
import com.goldproject.goldproject.dto.BillItemDTO;
import com.goldproject.goldproject.enums.MetalType;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PdfGenerationService {

    private final MetalPricingService metalPricingService;
    private final CompanyProfile companyProfile;

    private final DecimalFormat df = new DecimalFormat("#,##0.00");

    // Custom Colors for Graphics/CSS effect
    private final Color THEME_GOLD = new Color(184, 134, 11); // Dark Goldenrod
    private final Color THEME_NAVY = new Color(26, 35, 126);  // Indigo/Navy
    private final Color LIGHT_BG = new Color(245, 245, 245);  // Zebra striping

    public byte[] generateDomesticInvoice(BillDTO bill) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter writer = PdfWriter.getInstance(document, baos);
        document.open();

        // Fonts
        Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, THEME_NAVY);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, THEME_GOLD);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.DARK_GRAY);

        // --- HEADER LOGO AREA ---
        Paragraph companyName = new Paragraph(companyProfile.getName(), companyFont);
        companyName.setAlignment(Element.ALIGN_CENTER);
        document.add(companyName);

        Paragraph tagline = new Paragraph(companyProfile.getTagline().toUpperCase(), subTitleFont);
        tagline.setAlignment(Element.ALIGN_CENTER);
        document.add(tagline);

        Paragraph address = new Paragraph(
                "GSTIN: " + companyProfile.getGstin() + " | BIS Licence: " + companyProfile.getBisLicence() + "\n"
                        + companyProfile.getAddressLine() + "\n"
                        + "Ph: " + companyProfile.getPhone() + " | " + companyProfile.getEmail() + "\n\n", smallFont);
        address.setAlignment(Element.ALIGN_CENTER);
        document.add(address);

        // --- INVOICE TOP BAR ---
        PdfPTable titleTable = new PdfPTable(1);
        titleTable.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase("TAX INVOICE (B2C) — INTRA-STATE", headerFont));
        titleCell.setBackgroundColor(THEME_NAVY);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleCell.setPadding(6);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleTable.addCell(titleCell);
        document.add(titleTable);
        document.add(new Paragraph("\n"));

        // --- INFO SECTION (2 Columns) ---
        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);

        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.addElement(new Paragraph("Invoice No: " + bill.getId(), boldFont));
        leftCell.addElement(new Paragraph("Date: " + bill.getDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), normalFont));
        leftCell.addElement(new Paragraph("Supply Type: Intra-State (" + companyProfile.getStateName() + ")", normalFont));
        leftCell.addElement(new Paragraph("Place of Supply: " + companyProfile.getStateName()
                + " (" + companyProfile.getStateCode() + ")", normalFont));

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph billedTo = new Paragraph("BILLED TO:", boldFont);
        billedTo.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(billedTo);
        Paragraph custName = new Paragraph(bill.getCustomer().toUpperCase(), normalFont);
        custName.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(custName);
        Paragraph custPhone = new Paragraph("Contact: " + (bill.getPhone() != null ? bill.getPhone() : "N/A"), normalFont);
        custPhone.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(custPhone);
        Paragraph consumerTag = new Paragraph("Consumer (B2C)", normalFont);
        consumerTag.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(consumerTag);

        infoTable.addCell(leftCell);
        infoTable.addCell(rightCell);
        document.add(infoTable);
        document.add(new Paragraph("\n"));

        // --- ITEM TABLE (Colorful & Styled) — full detail: purity, HSN, GST% per line ---
        PdfPTable table = new PdfPTable(9);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.5f, 2.8f, 1.3f, 1.1f, 1.2f, 1f, 1.3f, 1f, 1.6f});

        String[] headers = {"#", "Item / HSN", "Weight(g)", "Purity", "Rate (₹/g)", "MC %", "Stone (₹)", "GST %", "Taxable (₹)"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(THEME_GOLD);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        // Grouped by GST% so the breakup table below mirrors exactly what each line was
        // actually taxed at (Domestic bills apply one rate per line, not a component split).
        Map<String, BigDecimal[]> gstGroups = new LinkedHashMap<>(); // rate -> {taxableSum}

        int count = 1;
        for (BillItemDTO item : bill.getItems()) {
            boolean isOdd = count % 2 != 0;
            BigDecimal qty = BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1);
            BigDecimal gstPercent = item.getGstPercent() != null ? item.getGstPercent() : new BigDecimal("3");
            BigDecimal mrp = item.getMrp() != null ? item.getMrp() : BigDecimal.ZERO;
            BigDecimal lineTaxable = mrp.divide(BigDecimal.ONE.add(gstPercent.divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP)), 2, RoundingMode.HALF_UP);

            String key = gstPercent.stripTrailingZeros().toPlainString();
            gstGroups.merge(key, new BigDecimal[]{lineTaxable.multiply(qty)},
                    (a, b) -> new BigDecimal[]{a[0].add(b[0])});

            String desc = item.getName() + (item.getHsnCode() != null && !item.getHsnCode().isBlank() ? "\nHSN: " + item.getHsnCode() : "");
            addStyledCell(table, String.valueOf(count++), normalFont, isOdd);
            addStyledCell(table, desc, normalFont, isOdd);
            addStyledCell(table, df.format(item.getWeight()) + " g", normalFont, isOdd);
            addStyledCell(table, item.getPurity(), normalFont, isOdd);
            addStyledCell(table, df.format(item.getRate()), normalFont, isOdd);
            addStyledCell(table, (item.getMakingPercent() != null ? item.getMakingPercent() : BigDecimal.ZERO) + "%", normalFont, isOdd);
            addStyledCell(table, df.format(item.getStoneValue() != null ? item.getStoneValue() : BigDecimal.ZERO), normalFont, isOdd);
            addStyledCell(table, gstPercent.stripTrailingZeros().toPlainString() + "%", normalFont, isOdd);
            addStyledCell(table, df.format(mrp), normalFont, isOdd);
        }
        document.add(table);
        document.add(new Paragraph("\n"));

        // --- GST BREAKUP TABLE (grouped by the rate actually applied per line) ---
        Paragraph gstTitle = new Paragraph("GST Breakup — CGST + SGST (Intra-State)", boldFont);
        document.add(gstTitle);
        document.add(new Paragraph("\n"));
        PdfPTable gstTable = new PdfPTable(5);
        gstTable.setWidthPercentage(100);
        String[] gstHeaders = {"Rate", "Taxable (₹)", "CGST (₹)", "SGST (₹)", "Total GST (₹)"};
        for (String h : gstHeaders) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(THEME_GOLD);
            cell.setPadding(5);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            gstTable.addCell(cell);
        }
        for (Map.Entry<String, BigDecimal[]> entry : gstGroups.entrySet()) {
            BigDecimal ratePct = new BigDecimal(entry.getKey());
            BigDecimal taxable = entry.getValue()[0];
            BigDecimal tax = taxable.multiply(ratePct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal half = tax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
            gstTable.addCell(plainCell(entry.getKey() + "%", normalFont));
            gstTable.addCell(plainCell(df.format(taxable), normalFont));
            gstTable.addCell(plainCell(df.format(half), normalFont));
            gstTable.addCell(plainCell(df.format(half), normalFont));
            gstTable.addCell(plainCell(df.format(tax), normalFont));
        }
        document.add(gstTable);

        // --- TOTALS AREA ---
        PdfPTable footerTable = new PdfPTable(2);
        footerTable.setWidthPercentage(100);
        footerTable.setWidths(new float[]{7f, 3f});

        // Left Side: Terms
        PdfPCell termsCell = new PdfPCell();
        termsCell.setBorder(Rectangle.NO_BORDER);
        termsCell.addElement(new Paragraph("Terms & Conditions:", boldFont));
        termsCell.addElement(new Paragraph(
                "1. All gold items BIS Hallmarked. Certificate on request.\n"
                        + "2. Goods once sold not taken back / exchanged without original invoice.\n"
                        + "3. Cash transactions above Rs 2,00,000 not accepted (Sec 269ST, IT Act).\n"
                        + "4. Disputes subject to " + companyProfile.getJurisdiction() + " jurisdiction.", smallFont));

        // Right Side: Calculations
        BigDecimal totalGst = bill.getGst() != null ? bill.getGst() : BigDecimal.ZERO;
        BigDecimal halfGst = totalGst.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP); // SPLIT INTO CGST & SGST
        BigDecimal grandTotal = bill.getTotal() != null ? bill.getTotal() : BigDecimal.ZERO;
        BigDecimal subtotal = grandTotal.subtract(totalGst);

        PdfPTable calcTable = new PdfPTable(2);
        calcTable.setWidthPercentage(100);
        addSummaryRow(calcTable, "Subtotal (Taxable)", df.format(subtotal), normalFont);
        addSummaryRow(calcTable, "CGST", df.format(halfGst), normalFont);
        addSummaryRow(calcTable, "SGST", df.format(halfGst), normalFont);
        addSummaryRow(calcTable, "Total Tax", df.format(totalGst), normalFont);

        PdfPCell grandLabel = new PdfPCell(new Phrase("GRAND TOTAL", boldFont));
        grandLabel.setBorder(Rectangle.BOTTOM);
        grandLabel.setPadding(5);
        PdfPCell grandValue = new PdfPCell(new Phrase("Rs " + df.format(grandTotal), boldFont));
        grandValue.setBorder(Rectangle.BOTTOM);
        grandValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        grandValue.setPadding(5);
        calcTable.addCell(grandLabel);
        calcTable.addCell(grandValue);

        PdfPCell rightSideCell = new PdfPCell(calcTable);
        rightSideCell.setBorder(Rectangle.NO_BORDER);

        footerTable.addCell(termsCell);
        footerTable.addCell(rightSideCell);
        document.add(new Paragraph("\n"));
        document.add(footerTable);

        // --- SIGNATURES ---
        document.add(new Paragraph("\n\n\n"));
        PdfPTable sigs = new PdfPTable(2);
        sigs.setWidthPercentage(100);
        PdfPCell s1 = new PdfPCell(new Phrase("____________________\nCustomer Signature", smallFont));
        s1.setBorder(Rectangle.NO_BORDER);
        PdfPCell s2 = new PdfPCell(new Phrase("For " + companyProfile.getName() + "\n\n\n____________________\nAuthorised Signatory", smallFont));
        s2.setBorder(Rectangle.NO_BORDER);
        s2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        sigs.addCell(s1);
        sigs.addCell(s2);
        document.add(sigs);

        document.close();
        return baos.toByteArray();
    }

    // Reference: SLS_MultiState_Bills.pdf. Renders a different heading/banner and GST
    // breakup depending on bill.getSupplyType() — INTRA_STATE (CGST+SGST), INTER_STATE
    // (IGST), UNION_TERRITORY (CGST+UTGST), or ZERO_RATED (SEZ/LUT, all NIL).
    public byte[] generateMultiStateInvoice(BillDTO bill) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(document, baos);
        document.open();

        String supplyType = bill.getSupplyType() != null ? bill.getSupplyType() : "INTRA_STATE";
        String bannerLabel = switch (supplyType) {
            case "INTER_STATE" -> "TAX INVOICE · INTER-STATE (IGST)";
            case "UNION_TERRITORY" -> "TAX INVOICE · UNION TERRITORY";
            case "ZERO_RATED" -> "TAX INVOICE · SUPPLY TO SEZ";
            default -> "TAX INVOICE · INTRA-STATE";
        };
        Color bannerColor = switch (supplyType) {
            case "INTER_STATE" -> new Color(74, 20, 140);      // purple
            case "UNION_TERRITORY" -> new Color(136, 14, 14);  // maroon
            case "ZERO_RATED" -> new Color(27, 94, 32);        // green
            default -> THEME_GOLD;
        };

        Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, THEME_NAVY);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, THEME_GOLD);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.DARK_GRAY);

        Paragraph companyName = new Paragraph(companyProfile.getName(), companyFont);
        companyName.setAlignment(Element.ALIGN_CENTER);
        document.add(companyName);

        Paragraph tagline = new Paragraph(companyProfile.getTagline().toUpperCase(), subTitleFont);
        tagline.setAlignment(Element.ALIGN_CENTER);
        document.add(tagline);

        Paragraph address = new Paragraph(
                "GSTIN: " + companyProfile.getGstin() + " | State Code: " + companyProfile.getStateCode()
                        + " | " + companyProfile.getStateName() + "\n"
                        + companyProfile.getAddressLine() + "\n"
                        + "Ph: " + companyProfile.getPhone() + " | " + companyProfile.getEmail() + "\n\n", smallFont);
        address.setAlignment(Element.ALIGN_CENTER);
        document.add(address);

        PdfPTable titleTable = new PdfPTable(1);
        titleTable.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase(bannerLabel, headerFont));
        titleCell.setBackgroundColor(bannerColor);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleCell.setPadding(6);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleTable.addCell(titleCell);
        document.add(titleTable);
        document.add(new Paragraph("\n"));

        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);

        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.addElement(new Paragraph("Invoice No: " + bill.getId(), boldFont));
        leftCell.addElement(new Paragraph("Date: " + bill.getDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), normalFont));
        leftCell.addElement(new Paragraph("Supplier State: " + companyProfile.getStateName()
                + " (" + companyProfile.getStateCode() + ")", normalFont));
        leftCell.addElement(new Paragraph("Place of Supply: " + safe(bill.getBuyerState())
                + " (" + safe(bill.getBuyerStateCode()) + ")", normalFont));

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph billedTo = new Paragraph("BILL TO:", boldFont);
        billedTo.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(billedTo);
        Paragraph custName = new Paragraph(bill.getCustomer().toUpperCase(), normalFont);
        custName.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(custName);
        boolean isB2B = bill.getBuyerGstin() != null && !bill.getBuyerGstin().isBlank();
        Paragraph custType = new Paragraph(isB2B ? "GSTIN: " + bill.getBuyerGstin() + " | B2B (ITC Eligible)" : "Consumer (B2C)", normalFont);
        custType.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(custType);
        if (bill.getBuyerPan() != null && !bill.getBuyerPan().isBlank()) {
            Paragraph pan = new Paragraph("PAN: " + bill.getBuyerPan(), normalFont);
            pan.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(pan);
        }

        infoTable.addCell(leftCell);
        infoTable.addCell(rightCell);
        document.add(infoTable);
        document.add(new Paragraph("\n"));

        // --- ITEM TABLE ---
        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.5f, 3.5f, 1.5f, 1.5f, 1.5f, 1.5f, 2f});
        String[] headers = {"#", "Item / HSN", "Weight(g)", "Purity", "Rate", "Making", "Taxable (₹)"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(bannerColor);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }

        BigDecimal metalTaxable = BigDecimal.ZERO;
        BigDecimal makingTaxable = BigDecimal.ZERO;
        BigDecimal stoneTaxable = BigDecimal.ZERO;
        BigDecimal metalRatePct = new BigDecimal("3");
        BigDecimal makingRatePct = new BigDecimal("5");
        BigDecimal stoneRatePct = new BigDecimal("0.25");

        int count = 1;
        for (BillItemDTO item : bill.getItems()) {
            boolean isOdd = count % 2 != 0;
            BigDecimal qty = BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1);
            MetalType metalType = (item.getMetalType() != null && !item.getMetalType().isBlank())
                    ? MetalType.valueOf(item.getMetalType()) : MetalType.GOLD;
            BigDecimal factor = metalPricingService.getPurityFactor(metalType, item.getPurity());
            BigDecimal rate = item.getRate() != null ? item.getRate() : BigDecimal.ZERO;
            BigDecimal weight = item.getWeight() != null ? item.getWeight() : BigDecimal.ZERO;
            BigDecimal makingPct = item.getMakingPercent() != null ? item.getMakingPercent() : BigDecimal.ZERO;
            BigDecimal stoneVal = item.getStoneValue() != null ? item.getStoneValue() : BigDecimal.ZERO;

            BigDecimal metalValue = weight.multiply(factor).multiply(rate);
            BigDecimal makingAmount = metalValue.multiply(makingPct).divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP);

            metalTaxable = metalTaxable.add(metalValue.multiply(qty));
            makingTaxable = makingTaxable.add(makingAmount.multiply(qty));
            stoneTaxable = stoneTaxable.add(stoneVal.multiply(qty));
            if (item.getMetalGstPercent() != null) metalRatePct = item.getMetalGstPercent();
            if (item.getMakingGstPercent() != null) makingRatePct = item.getMakingGstPercent();
            if (item.getStoneGstPercent() != null) stoneRatePct = item.getStoneGstPercent();

            String desc = item.getName() + (item.getHsnCode() != null && !item.getHsnCode().isBlank() ? "\nHSN: " + item.getHsnCode() : "");
            addStyledCell(table, String.valueOf(count++), normalFont, isOdd);
            addStyledCell(table, desc, normalFont, isOdd);
            addStyledCell(table, df.format(weight), normalFont, isOdd);
            addStyledCell(table, item.getPurity(), normalFont, isOdd);
            addStyledCell(table, df.format(rate), normalFont, isOdd);
            addStyledCell(table, makingPct + "%", normalFont, isOdd);
            addStyledCell(table, df.format(item.getMrp()), normalFont, isOdd);
        }
        document.add(table);
        document.add(new Paragraph("\n"));

        // --- GST BREAKUP TABLE ---
        boolean zeroRated = "ZERO_RATED".equals(supplyType);
        BigDecimal metalTax = zeroRated ? BigDecimal.ZERO : metalTaxable.multiply(metalRatePct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal makingTax = zeroRated ? BigDecimal.ZERO : makingTaxable.multiply(makingRatePct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal stoneTax = zeroRated ? BigDecimal.ZERO : stoneTaxable.multiply(stoneRatePct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        Paragraph gstTitle = new Paragraph("GST Breakup" + (zeroRated ? " — Zero-Rated (LUT)" : ""), boldFont);
        document.add(gstTitle);
        document.add(new Paragraph("\n"));

        int gstCols = "INTER_STATE".equals(supplyType) ? 4 : 5;
        PdfPTable gstTable = new PdfPTable(gstCols);
        gstTable.setWidthPercentage(100);
        String col3Label = switch (supplyType) {
            case "INTER_STATE" -> "IGST";
            case "UNION_TERRITORY" -> "UTGST";
            default -> "SGST";
        };
        String[] gstHeaders = "INTER_STATE".equals(supplyType)
                ? new String[]{"Component", "Taxable (₹)", "Rate", "IGST (₹)"}
                : new String[]{"Component", "Taxable (₹)", "Rate", "CGST (₹)", col3Label + " (₹)"};
        for (String h : gstHeaders) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(bannerColor);
            cell.setPadding(5);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            gstTable.addCell(cell);
        }
        addMultiStateGstRow(gstTable, "Gold/Metal", metalTaxable, metalRatePct, metalTax, supplyType, normalFont);
        addMultiStateGstRow(gstTable, "Making Charges", makingTaxable, makingRatePct, makingTax, supplyType, normalFont);
        addMultiStateGstRow(gstTable, "Diamond/Stone", stoneTaxable, stoneRatePct, stoneTax, supplyType, normalFont);
        document.add(gstTable);
        document.add(new Paragraph("\n"));

        // --- TOTALS ---
        PdfPTable calcTable = new PdfPTable(2);
        calcTable.setWidthPercentage(60);
        calcTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        BigDecimal subtotal = metalTaxable.add(makingTaxable).add(stoneTaxable);
        addSummaryRow(calcTable, "Subtotal (Taxable)", "Rs " + df.format(subtotal), normalFont);
        if (zeroRated) {
            addSummaryRow(calcTable, "IGST/CGST/SGST", "NIL (LUT)", normalFont);
        } else if ("INTER_STATE".equals(supplyType)) {
            addSummaryRow(calcTable, "IGST", "Rs " + df.format(bill.getIgst()), normalFont);
        } else if ("UNION_TERRITORY".equals(supplyType)) {
            addSummaryRow(calcTable, "CGST", "Rs " + df.format(bill.getCgst()), normalFont);
            addSummaryRow(calcTable, "UTGST", "Rs " + df.format(bill.getUtgst()), normalFont);
        } else {
            addSummaryRow(calcTable, "CGST", "Rs " + df.format(bill.getCgst()), normalFont);
            addSummaryRow(calcTable, "SGST", "Rs " + df.format(bill.getSgst()), normalFont);
        }
        PdfPCell grandLabel = new PdfPCell(new Phrase("GRAND TOTAL", boldFont));
        grandLabel.setBorder(Rectangle.BOTTOM);
        grandLabel.setPadding(5);
        PdfPCell grandValue = new PdfPCell(new Phrase("Rs " + df.format(bill.getTotal()), boldFont));
        grandValue.setBorder(Rectangle.BOTTOM);
        grandValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        grandValue.setPadding(5);
        calcTable.addCell(grandLabel);
        calcTable.addCell(grandValue);
        document.add(calcTable);

        document.add(new Paragraph("\n\n\n"));
        PdfPTable sigs = new PdfPTable(2);
        sigs.setWidthPercentage(100);
        PdfPCell s1 = new PdfPCell(new Phrase("____________________\nCustomer Signature", smallFont));
        s1.setBorder(Rectangle.NO_BORDER);
        PdfPCell s2 = new PdfPCell(new Phrase("For " + companyProfile.getName() + "\n\n\n____________________\nAuthorised Signatory", smallFont));
        s2.setBorder(Rectangle.NO_BORDER);
        s2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        sigs.addCell(s1);
        sigs.addCell(s2);
        document.add(sigs);

        document.close();
        return baos.toByteArray();
    }

    private void addMultiStateGstRow(PdfPTable table, String label, BigDecimal taxable, BigDecimal ratePct,
                                      BigDecimal tax, String supplyType, Font font) {
        table.addCell(plainCell(label, font));
        table.addCell(plainCell(df.format(taxable), font));
        table.addCell(plainCell(ratePct + "%", font));
        if ("INTER_STATE".equals(supplyType)) {
            table.addCell(plainCell(df.format(tax), font));
        } else {
            BigDecimal half = tax.divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
            table.addCell(plainCell(df.format(half), font));
            table.addCell(plainCell(df.format(half), font));
        }
    }

    private PdfPCell plainCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private String safe(String s) {
        return s != null ? s : "N/A";
    }

    // Reference: SLS_Export_Invoice.pdf. Zero-rated export under LUT — no GST payable;
    // adds shipping/customs details and FOB(INR)/CIF(INR+USD) that the Domestic template
    // doesn't need.
    public byte[] generateExportInvoice(BillDTO bill) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(document, baos);
        document.open();

        Color exportGreen = new Color(27, 94, 32);
        Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, THEME_NAVY);
        Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, THEME_GOLD);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
        Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
        Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.DARK_GRAY);

        Paragraph companyName = new Paragraph(companyProfile.getName(), companyFont);
        companyName.setAlignment(Element.ALIGN_CENTER);
        document.add(companyName);
        Paragraph tagline = new Paragraph(companyProfile.getTagline().toUpperCase(), subTitleFont);
        tagline.setAlignment(Element.ALIGN_CENTER);
        document.add(tagline);
        Paragraph address = new Paragraph(
                "GSTIN: " + companyProfile.getGstin() + " | IEC: " + safe(bill.getIecCode())
                        + " | AD Code: " + safe(bill.getAdCode()) + "\n"
                        + companyProfile.getAddressLine() + "\n"
                        + "Ph: " + companyProfile.getPhone() + " | " + companyProfile.getExportEmail() + "\n\n", smallFont);
        address.setAlignment(Element.ALIGN_CENTER);
        document.add(address);

        PdfPTable titleTable = new PdfPTable(1);
        titleTable.setWidthPercentage(100);
        PdfPCell titleCell = new PdfPCell(new Phrase("EXPORT TAX INVOICE — ZERO-RATED SUPPLY (LUT)", headerFont));
        titleCell.setBackgroundColor(exportGreen);
        titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        titleCell.setPadding(6);
        titleCell.setBorder(Rectangle.NO_BORDER);
        titleTable.addCell(titleCell);
        document.add(titleTable);
        document.add(new Paragraph("\n"));

        PdfPTable infoTable = new PdfPTable(2);
        infoTable.setWidthPercentage(100);
        PdfPCell leftCell = new PdfPCell();
        leftCell.setBorder(Rectangle.NO_BORDER);
        leftCell.addElement(new Paragraph("Invoice No: " + bill.getId(), boldFont));
        leftCell.addElement(new Paragraph("Date: " + bill.getDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")), normalFont));
        leftCell.addElement(new Paragraph("LUT No: " + safe(bill.getLutNumber()), normalFont));
        leftCell.addElement(new Paragraph("Exchange Rate: 1 USD = INR " + (bill.getExchangeRate() != null ? df.format(bill.getExchangeRate()) : "N/A"), normalFont));

        PdfPCell rightCell = new PdfPCell();
        rightCell.setBorder(Rectangle.NO_BORDER);
        rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph consignee = new Paragraph("CONSIGNEE / IMPORTER:", boldFont);
        consignee.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(consignee);
        Paragraph custName = new Paragraph(bill.getCustomer().toUpperCase(), normalFont);
        custName.setAlignment(Element.ALIGN_RIGHT);
        rightCell.addElement(custName);
        if (bill.getConsigneeAddress() != null && !bill.getConsigneeAddress().isBlank()) {
            Paragraph addr = new Paragraph(bill.getConsigneeAddress() + ", " + safe(bill.getConsigneeCountry()), normalFont);
            addr.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(addr);
        }
        if (bill.getConsigneeVat() != null && !bill.getConsigneeVat().isBlank()) {
            Paragraph vat = new Paragraph("VAT/EORI: " + bill.getConsigneeVat(), normalFont);
            vat.setAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(vat);
        }
        infoTable.addCell(leftCell);
        infoTable.addCell(rightCell);
        document.add(infoTable);
        document.add(new Paragraph("\n"));

        // --- SHIPPING & CUSTOMS DETAILS ---
        document.add(new Paragraph("Shipping & Customs Details", boldFont));
        document.add(new Paragraph("\n"));
        PdfPTable shipTable = new PdfPTable(4);
        shipTable.setWidthPercentage(100);
        addShipRow(shipTable, "Port of Loading", safe(bill.getPortOfLoading()), "Port of Discharge", safe(bill.getPortOfDischarge()), normalFont, boldFont);
        addShipRow(shipTable, "Country of Origin", safe(bill.getCountryOfOrigin()), "Country of Destination", safe(bill.getCountryOfDestination()), normalFont, boldFont);
        addShipRow(shipTable, "Incoterms", safe(bill.getIncoterms()), "Mode of Transport", safe(bill.getModeOfTransport()), normalFont, boldFont);
        addShipRow(shipTable, "Vessel / Flight No", safe(bill.getVesselFlightNo()), "Bill of Lading No", safe(bill.getBillOfLadingNo()), normalFont, boldFont);
        addShipRow(shipTable, "Shipping Bill No", safe(bill.getShippingBillNo()), "Let Export Order", safe(bill.getLetExportOrder()), normalFont, boldFont);
        addShipRow(shipTable, "Packing", safe(bill.getPackingDetails()),
                "Gross Weight (packed)", bill.getGrossWeightPacked() != null ? df.format(bill.getGrossWeightPacked()) + " g" : "N/A", normalFont, boldFont);
        document.add(shipTable);
        document.add(new Paragraph("\n"));

        // --- ITEM TABLE ---
        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.5f, 3.5f, 1.5f, 1.5f, 2f, 1.8f});
        String[] headers = {"#", "Item / HSN", "Weight(g)", "Purity", "Total INR (₹)", "FOB (USD)"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(exportGreen);
            cell.setPadding(6);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            table.addCell(cell);
        }
        int count = 1;
        for (BillItemDTO item : bill.getItems()) {
            boolean isOdd = count % 2 != 0;
            String desc = item.getName() + (item.getHsnCode() != null && !item.getHsnCode().isBlank() ? "\nHSN: " + item.getHsnCode() : "");
            addStyledCell(table, String.valueOf(count++), normalFont, isOdd);
            addStyledCell(table, desc, normalFont, isOdd);
            addStyledCell(table, df.format(item.getWeight()), normalFont, isOdd);
            addStyledCell(table, item.getPurity(), normalFont, isOdd);
            addStyledCell(table, df.format(item.getMrp()), normalFont, isOdd);
            addStyledCell(table, item.getFobUsd() != null ? df.format(item.getFobUsd()) : "-", normalFont, isOdd);
        }
        document.add(table);
        document.add(new Paragraph("\n"));

        // --- GST DECLARATION ---
        Paragraph gstNote = new Paragraph("GST Declaration: Zero-Rated Export under LUT — IGST/CGST/SGST = NIL. Supplier must file LUT details in GSTR-1 Table 6A.", smallFont);
        document.add(gstNote);
        document.add(new Paragraph("\n"));

        // --- FOB / CIF TOTALS ---
        BigDecimal fobInr = bill.getTotal() != null ? bill.getTotal() : BigDecimal.ZERO;
        BigDecimal freight = bill.getFreightCharges() != null ? bill.getFreightCharges() : BigDecimal.ZERO;
        BigDecimal insurance = bill.getInsuranceCharges() != null ? bill.getInsuranceCharges() : BigDecimal.ZERO;
        BigDecimal cifInr = fobInr.add(freight).add(insurance);
        BigDecimal exRate = bill.getExchangeRate() != null && bill.getExchangeRate().compareTo(BigDecimal.ZERO) > 0
                ? bill.getExchangeRate() : null;
        BigDecimal cifUsd = exRate != null ? cifInr.divide(exRate, 2, RoundingMode.HALF_UP) : null;

        PdfPTable calcTable = new PdfPTable(2);
        calcTable.setWidthPercentage(60);
        calcTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
        addSummaryRow(calcTable, "FOB Value (INR)", "Rs " + df.format(fobInr), normalFont);
        addSummaryRow(calcTable, "Freight Charges", "Rs " + df.format(freight), normalFont);
        addSummaryRow(calcTable, "Insurance", "Rs " + df.format(insurance), normalFont);
        addSummaryRow(calcTable, "GST / Export Duty", "NIL (Zero-Rated LUT)", normalFont);
        PdfPCell grandLabel = new PdfPCell(new Phrase("CIF VALUE (INR)", boldFont));
        grandLabel.setBorder(Rectangle.BOTTOM);
        grandLabel.setPadding(5);
        PdfPCell grandValue = new PdfPCell(new Phrase("Rs " + df.format(cifInr), boldFont));
        grandValue.setBorder(Rectangle.BOTTOM);
        grandValue.setHorizontalAlignment(Element.ALIGN_RIGHT);
        grandValue.setPadding(5);
        calcTable.addCell(grandLabel);
        calcTable.addCell(grandValue);
        if (cifUsd != null) {
            addSummaryRow(calcTable, "CIF Value (USD)", "$ " + df.format(cifUsd), normalFont);
        }
        document.add(calcTable);
        document.add(new Paragraph("\n"));

        Paragraph bankTitle = new Paragraph("Bank Details (for inward remittance)", boldFont);
        document.add(bankTitle);
        Paragraph bankDetails = new Paragraph(
                "Bank: " + companyProfile.getBankName() + "\n"
                        + "A/c No: " + companyProfile.getBankAccount() + " | IFSC: " + companyProfile.getIfsc()
                        + " | SWIFT: " + companyProfile.getSwift(), smallFont);
        document.add(bankDetails);

        document.add(new Paragraph("\n\n"));
        PdfPTable sigs = new PdfPTable(2);
        sigs.setWidthPercentage(100);
        PdfPCell s1 = new PdfPCell(new Phrase("We certify goods are of Indian origin.\n\n____________________\nAuthorised Signatory", smallFont));
        s1.setBorder(Rectangle.NO_BORDER);
        sigs.addCell(s1);
        document.add(sigs);

        document.close();
        return baos.toByteArray();
    }

    private void addShipRow(PdfPTable table, String label1, String value1, String label2, String value2,
                             Font normalFont, Font boldFont) {
        table.addCell(labelCell(label1, boldFont));
        table.addCell(valueCell(value1, normalFont));
        table.addCell(labelCell(label2, boldFont));
        table.addCell(valueCell(value2, normalFont));
    }

    private PdfPCell labelCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(LIGHT_BG);
        cell.setPadding(5);
        return cell;
    }

    private PdfPCell valueCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        return cell;
    }

    private void addStyledCell(PdfPTable table, String text, Font font, boolean isOdd) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(Color.LIGHT_GRAY);
        if (!isOdd) cell.setBackgroundColor(LIGHT_BG);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        c1.setBorder(Rectangle.NO_BORDER);
        PdfPCell c2 = new PdfPCell(new Phrase(value, font));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(c1);
        table.addCell(c2);
    }
}