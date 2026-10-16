package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.BillDTO;
import com.goldproject.goldproject.service.BillService;
import com.goldproject.goldproject.service.PdfGenerationService;
import com.lowagie.text.DocumentException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bills")
@CrossOrigin(origins = "*") // Allows your React frontend to connect
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final PdfGenerationService pdfGenerationService;

    @GetMapping
    public ResponseEntity<List<BillDTO>> getBills(
            @RequestParam(required = false) String orderType) {
        return ResponseEntity.ok(billService.getBills(orderType));
    }

    @PostMapping
    public ResponseEntity<BillDTO> createBill(@RequestBody BillDTO billDTO) {
        BillDTO savedBill = billService.createBill(billDTO);
        return new ResponseEntity<>(savedBill, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BillDTO> getBillById(@PathVariable String id) {
        return ResponseEntity.ok(billService.getBillById(id));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getBillPdf(@PathVariable String id) {
        try {
            // 1. Fetch the bill data from the database
            BillDTO bill = billService.getBillById(id);

            // 2. Generate the PDF byte array — routed by order type; Purchase/Repair fall
            // back to the Domestic template (no dedicated design requested for those yet).
            String orderType = bill.getOrderType() != null ? bill.getOrderType().toUpperCase() : "";
            byte[] pdfBytes = switch (orderType) {
                case "EXPORT" -> pdfGenerationService.generateExportInvoice(bill);
                case "MULTISTATE" -> pdfGenerationService.generateMultiStateInvoice(bill);
                default -> pdfGenerationService.generateDomesticInvoice(bill);
            };

            // 3. Set headers to prompt a file download or inline view in the browser
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "Invoice_" + id + ".pdf");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        } catch (DocumentException e) {
            return ResponseEntity.internalServerError().body(null);
        }
    }
}