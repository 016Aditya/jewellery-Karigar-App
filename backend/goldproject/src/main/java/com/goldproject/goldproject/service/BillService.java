package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.BillDTO;
import com.goldproject.goldproject.dto.BillItemDTO;
import com.goldproject.goldproject.entity.Bill;
import com.goldproject.goldproject.entity.BillItem;
import com.goldproject.goldproject.entity.ItemTracking;
import com.goldproject.goldproject.enums.MetalType;
import com.goldproject.goldproject.repository.BillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillService {

    private final BillRepository billRepository;
    private final MetalPricingService metalPricingService;
    private final GstSupplyTypeService gstSupplyTypeService;

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO = new BigDecimal("2");
    private static final int CALC_SCALE = 10; // intermediate precision before final rounding

    // List view: deliberately does NOT touch bill.getItems() — items is a LAZY collection,
    // so mapping every bill's items here would trigger one extra SELECT per bill (N+1).
    // The list only ever displays summary fields; full item detail is loaded separately
    // via getBillById when a specific bill is opened.
    public List<BillDTO> getBills(String orderType) {
        List<Bill> bills;
        if (orderType != null && !orderType.isEmpty() && !orderType.equalsIgnoreCase("ALL")) {
            bills = billRepository.findAllByOrderTypeOrderByDateDescCreatedAtDesc(orderType);
        } else {
            bills = billRepository.findAllByOrderByDateDescCreatedAtDesc();
        }
        return bills.stream().map(this::mapToSummaryDTO).collect(Collectors.toList());
    }

    public BillDTO createBill(BillDTO billDTO) {
        Bill bill = new Bill();
        // Generated server-side, never trusted from the client — the previous
        // `INV-${Date.now().toString().slice(-5)}` scheme on the frontend only kept the
        // last 5 digits of the timestamp, which wraps around (and can collide) roughly
        // every 100 seconds. Instant.now().toEpochMilli() is monotonically increasing and
        // effectively unique per millisecond.
        bill.setId(billIdPrefix(billDTO.getOrderType()) + "-" + java.time.Instant.now().toEpochMilli());
        bill.setType(billDTO.getType());

        // Expanded compliance and workflow fields
        bill.setOrderType(billDTO.getOrderType());
        bill.setLutNumber(billDTO.getLutNumber());
        bill.setIecCode(billDTO.getIecCode());
        bill.setAdCode(billDTO.getAdCode());
        bill.setExchangeRate(billDTO.getExchangeRate());
        bill.setPortOfLoading(billDTO.getPortOfLoading());
        bill.setPortOfDischarge(billDTO.getPortOfDischarge());
        bill.setConsigneeVat(billDTO.getConsigneeVat());

        bill.setBillCategory(billDTO.getBillCategory());
        bill.setExchangeReceipt(billDTO.getExchangeReceipt());
        bill.setDate(billDTO.getDate());
        bill.setCustomer(billDTO.getCustomer());
        bill.setPhone(billDTO.getPhone());
        bill.setStatus(billDTO.getStatus());

        // Export-only shipping/customs fields — harmless to set unconditionally, they're
        // simply null for other bill types.
        bill.setIncoterms(billDTO.getIncoterms());
        bill.setModeOfTransport(billDTO.getModeOfTransport());
        bill.setVesselFlightNo(billDTO.getVesselFlightNo());
        bill.setBillOfLadingNo(billDTO.getBillOfLadingNo());
        bill.setShippingBillNo(billDTO.getShippingBillNo());
        bill.setLetExportOrder(billDTO.getLetExportOrder());
        bill.setPackingDetails(billDTO.getPackingDetails());
        bill.setGrossWeightPacked(billDTO.getGrossWeightPacked());
        bill.setCountryOfOrigin(billDTO.getCountryOfOrigin());
        bill.setCountryOfDestination(billDTO.getCountryOfDestination());
        bill.setFreightCharges(billDTO.getFreightCharges());
        bill.setInsuranceCharges(billDTO.getInsuranceCharges());
        bill.setConsigneeAddress(billDTO.getConsigneeAddress());
        bill.setConsigneeCountry(billDTO.getConsigneeCountry());

        boolean isDomestic = "DOMESTIC".equalsIgnoreCase(billDTO.getOrderType());
        boolean isMultiState = "MULTISTATE".equalsIgnoreCase(billDTO.getOrderType());
        String orderType = billDTO.getOrderType();

        // Multi-State: the supply type (and therefore which GST components apply) is
        // determined once for the whole bill from the buyer's state, not per line item.
        String supplyType = null;
        if (isMultiState) {
            boolean isSez = Boolean.TRUE.equals(billDTO.getIsSez());
            supplyType = gstSupplyTypeService.determineSupplyType(billDTO.getBuyerStateCode(), isSez);
            bill.setBuyerGstin(billDTO.getBuyerGstin());
            bill.setBuyerPan(billDTO.getBuyerPan());
            bill.setBuyerState(billDTO.getBuyerState());
            bill.setBuyerStateCode(billDTO.getBuyerStateCode());
            bill.setIsSez(isSez);
            bill.setSupplyType(supplyType);
        }

        BigDecimal billTotal = BigDecimal.ZERO;
        BigDecimal billGst = BigDecimal.ZERO;
        BigDecimal billCgst = BigDecimal.ZERO;
        BigDecimal billSgst = BigDecimal.ZERO;
        BigDecimal billIgst = BigDecimal.ZERO;
        BigDecimal billUtgst = BigDecimal.ZERO;

        if (billDTO.getItems() != null) {
            for (BillItemDTO itemDTO : billDTO.getItems()) {
                BillItem item = new BillItem();
                item.setName(itemDTO.getName());
                item.setCode(itemDTO.getCode());
                item.setHsnCode(itemDTO.getHsnCode());
                item.setPurity(itemDTO.getPurity());
                item.setWeight(itemDTO.getWeight());
                item.setQuantity(itemDTO.getQuantity() != null ? itemDTO.getQuantity() : 1);
                item.setRate(itemDTO.getRate());
                item.setProductId(itemDTO.getProductId());
                if (itemDTO.getMetalType() != null && !itemDTO.getMetalType().isBlank()) {
                    item.setMetalType(MetalType.valueOf(itemDTO.getMetalType()));
                }

                // New Audit Fields
                item.setOldWeight(itemDTO.getOldWeight());
                item.setOldPrice(itemDTO.getOldPrice());
                item.setGstPercent(itemDTO.getGstPercent());
                item.setMetalGstPercent(itemDTO.getMetalGstPercent());
                item.setMakingGstPercent(itemDTO.getMakingGstPercent());
                item.setStoneGstPercent(itemDTO.getStoneGstPercent());

                // Advanced Valuation fields
                item.setStoneValue(itemDTO.getStoneValue());
                item.setWastagePercent(itemDTO.getWastagePercent());
                item.setLaborAmount(itemDTO.getLaborAmount());
                item.setFobUsd(itemDTO.getFobUsd());

                item.setMakingPercent(itemDTO.getMakingPercent());
                item.setMrp(itemDTO.getMrp());

                BigDecimal qty = BigDecimal.valueOf(item.getQuantity() != null ? item.getQuantity() : 1);

                // Every bill type is recomputed authoritatively server-side with BigDecimal —
                // rate, purity factor, and the resulting mrp/gst are never trusted from the
                // client, whether the line is a manual entry or Catalogue-sourced (productId
                // set). Only the raw inputs (weight, making %, stone value, labor, etc.) are
                // trusted — those are user/catalogue-entered values, not calculations.
                BigDecimal lineGst;
                if (isDomestic) {
                    lineGst = recalculateDomesticItem(item);
                } else if (isMultiState) {
                    BigDecimal[] split = recalculateMultiStateItem(item, supplyType);
                    billCgst = billCgst.add(split[0].multiply(qty));
                    billSgst = billSgst.add(split[1].multiply(qty));
                    billIgst = billIgst.add(split[2].multiply(qty));
                    billUtgst = billUtgst.add(split[3].multiply(qty));
                    lineGst = split[0].add(split[1]).add(split[2]).add(split[3]);
                } else {
                    lineGst = recalculateExportPurchaseRepairItem(item, orderType, billDTO.getExchangeRate());
                }

                billTotal = billTotal.add(item.getMrp().multiply(qty));
                billGst = billGst.add(lineGst.multiply(qty));

                // Inside BillService.java -> createBill method, right before `bill.addItem(item);`
                ItemTracking tracking = new ItemTracking();
                tracking.setCurrentStage("Design");
                tracking.setProgress(14); // Initial progress
                tracking.setBillItem(item);
                item.setTracking(tracking);

                bill.addItem(item);
            }
        }

        bill.setTotal(billTotal.setScale(2, RoundingMode.HALF_UP));
        bill.setGst(billGst.setScale(2, RoundingMode.HALF_UP));
        if (isMultiState) {
            bill.setCgst(billCgst.setScale(2, RoundingMode.HALF_UP));
            bill.setSgst(billSgst.setScale(2, RoundingMode.HALF_UP));
            bill.setIgst(billIgst.setScale(2, RoundingMode.HALF_UP));
            bill.setUtgst(billUtgst.setScale(2, RoundingMode.HALF_UP));
        }

        Bill savedBill = billRepository.save(bill);
        return mapToDTO(savedBill);
    }

    // Recomputes metalValue/makingAmount/taxableValue/gst/mrp for a Domestic line item using
    // BigDecimal end-to-end — no intermediate rounding, so minute jewellery values aren't
    // lost to floating-point drift. Runs for every Domestic line regardless of origin
    // (manual entry or Catalogue-sourced/productId set). Returns the GST amount so the
    // caller can roll it into Bill.gst.
    private BigDecimal recalculateDomesticItem(BillItem item) {
        MetalType metalType = item.getMetalType() != null ? item.getMetalType() : MetalType.GOLD;
        BigDecimal rate = metalPricingService.getLatestRate(metalType);
        BigDecimal factor = metalPricingService.getPurityFactor(metalType, item.getPurity());

        BigDecimal weight = item.getWeight() != null ? item.getWeight() : BigDecimal.ZERO;
        BigDecimal makingPercent = item.getMakingPercent() != null ? item.getMakingPercent() : BigDecimal.ZERO;
        BigDecimal stoneValue = item.getStoneValue() != null ? item.getStoneValue() : BigDecimal.ZERO;
        BigDecimal gstPercent = item.getGstPercent() != null ? item.getGstPercent() : new BigDecimal("3");

        BigDecimal metalValue = weight.multiply(factor).multiply(rate);
        BigDecimal makingAmount = metalValue.multiply(makingPercent)
                .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal taxableValue = metalValue.add(stoneValue).add(makingAmount);
        BigDecimal gstAmount = taxableValue.multiply(gstPercent)
                .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal mrp = taxableValue.add(gstAmount);

        item.setRate(rate.setScale(4, RoundingMode.HALF_UP));
        item.setGstPercent(gstPercent);
        item.setMrp(mrp.setScale(2, RoundingMode.HALF_UP));
        return gstAmount.setScale(2, RoundingMode.HALF_UP);
    }

    // Export/Purchase/Repair have no per-item metal-family concept today (the client never
    // sends a metalType for these three) — they're always priced off the plain GOLD rate.
    // Mirrors each bill type's formula from the frontend's calculateItemValue
    // (billingMath.js) exactly, just computed here in BigDecimal so the persisted rate/mrp
    // is never just whatever JS Number math the client happened to post. Returns the GST
    // amount so the caller can roll it into Bill.gst.
    private BigDecimal recalculateExportPurchaseRepairItem(BillItem item, String orderType, BigDecimal exchangeRate) {
        BigDecimal rate = metalPricingService.getLatestRate(MetalType.GOLD);
        BigDecimal factor = metalPricingService.getPurityFactor(MetalType.GOLD, item.getPurity());

        BigDecimal weight = item.getWeight() != null ? item.getWeight() : BigDecimal.ZERO;
        BigDecimal stoneValue = item.getStoneValue() != null ? item.getStoneValue() : BigDecimal.ZERO;
        BigDecimal makingPercent = item.getMakingPercent() != null ? item.getMakingPercent() : BigDecimal.ZERO;
        BigDecimal gstPercent = item.getGstPercent() != null ? item.getGstPercent() : BigDecimal.ZERO;

        BigDecimal baseMetalValue = weight.multiply(factor).multiply(rate);
        BigDecimal makingAmount = baseMetalValue.multiply(makingPercent)
                .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);

        BigDecimal mrp;
        BigDecimal gstAmount;

        if ("PURCHASE".equalsIgnoreCase(orderType)) {
            BigDecimal wastagePercent = item.getWastagePercent() != null ? item.getWastagePercent() : BigDecimal.ZERO;
            BigDecimal wastageFactor = BigDecimal.ONE.subtract(
                    wastagePercent.divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP));
            mrp = weight.multiply(wastageFactor).multiply(rate).multiply(factor);
            gstAmount = BigDecimal.ZERO;
        } else if ("REPAIR".equalsIgnoreCase(orderType)) {
            BigDecimal laborAmount = item.getLaborAmount() != null ? item.getLaborAmount() : BigDecimal.ZERO;
            BigDecimal taxableValue = laborAmount.add(baseMetalValue);
            gstAmount = laborAmount.multiply(new BigDecimal("0.18"))
                    .add(baseMetalValue.multiply(gstPercent).divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP));
            mrp = taxableValue.add(gstAmount);
        } else { // EXPORT (and any other non-Domestic type)
            mrp = baseMetalValue.add(stoneValue).add(makingAmount);
            gstAmount = BigDecimal.ZERO;
        }

        item.setRate(rate.setScale(4, RoundingMode.HALF_UP));
        item.setMrp(mrp.setScale(2, RoundingMode.HALF_UP));

        if ("EXPORT".equalsIgnoreCase(orderType)
                && exchangeRate != null && exchangeRate.compareTo(BigDecimal.ZERO) > 0) {
            item.setFobUsd(item.getMrp().divide(exchangeRate, 2, RoundingMode.HALF_UP));
        }

        return gstAmount.setScale(2, RoundingMode.HALF_UP);
    }

    // Multi-State bills tax Metal/Making/Stone at different, user-editable GST rates
    // (default 3% / 5% / 0.25%), then split the combined tax into CGST+SGST, IGST, or
    // CGST+UTGST — or zero it entirely under SEZ/LUT — based on the bill-level supplyType
    // GstSupplyTypeService already determined. Returns {cgst, sgst, igst, utgst} for this
    // line so the caller can roll them into the bill-level totals.
    private BigDecimal[] recalculateMultiStateItem(BillItem item, String supplyType) {
        MetalType metalType = item.getMetalType() != null ? item.getMetalType() : MetalType.GOLD;
        BigDecimal rate = metalPricingService.getLatestRate(metalType);
        BigDecimal factor = metalPricingService.getPurityFactor(metalType, item.getPurity());

        BigDecimal weight = item.getWeight() != null ? item.getWeight() : BigDecimal.ZERO;
        BigDecimal makingPercent = item.getMakingPercent() != null ? item.getMakingPercent() : BigDecimal.ZERO;
        BigDecimal stoneValue = item.getStoneValue() != null ? item.getStoneValue() : BigDecimal.ZERO;
        BigDecimal metalGstPercent = item.getMetalGstPercent() != null ? item.getMetalGstPercent() : new BigDecimal("3");
        BigDecimal makingGstPercent = item.getMakingGstPercent() != null ? item.getMakingGstPercent() : new BigDecimal("5");
        BigDecimal stoneGstPercent = item.getStoneGstPercent() != null ? item.getStoneGstPercent() : new BigDecimal("0.25");
        item.setMetalGstPercent(metalGstPercent);
        item.setMakingGstPercent(makingGstPercent);
        item.setStoneGstPercent(stoneGstPercent);

        BigDecimal metalValue = weight.multiply(factor).multiply(rate);
        BigDecimal makingAmount = metalValue.multiply(makingPercent)
                .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal taxableValue = metalValue.add(stoneValue).add(makingAmount);

        boolean zeroRated = "ZERO_RATED".equals(supplyType);
        BigDecimal totalTax = zeroRated ? BigDecimal.ZERO
                : metalValue.multiply(metalGstPercent)
                        .add(makingAmount.multiply(makingGstPercent))
                        .add(stoneValue.multiply(stoneGstPercent))
                        .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);

        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal igst = BigDecimal.ZERO;
        BigDecimal utgst = BigDecimal.ZERO;
        if (!zeroRated) {
            switch (supplyType) {
                case "INTRA_STATE" -> {
                    cgst = totalTax.divide(TWO, CALC_SCALE, RoundingMode.HALF_UP);
                    sgst = cgst;
                }
                case "UNION_TERRITORY" -> {
                    cgst = totalTax.divide(TWO, CALC_SCALE, RoundingMode.HALF_UP);
                    utgst = cgst;
                }
                default -> igst = totalTax; // INTER_STATE
            }
        }

        BigDecimal mrp = taxableValue.add(totalTax);
        item.setRate(rate.setScale(4, RoundingMode.HALF_UP));
        item.setMrp(mrp.setScale(2, RoundingMode.HALF_UP));

        return new BigDecimal[]{
                cgst.setScale(2, RoundingMode.HALF_UP),
                sgst.setScale(2, RoundingMode.HALF_UP),
                igst.setScale(2, RoundingMode.HALF_UP),
                utgst.setScale(2, RoundingMode.HALF_UP)
        };
    }

    // Mirrors the prefix convention the frontend previously used per bill type
    // (DomesticBill/RepairBill -> "INV", ExportBill -> "EXP", PurchaseBill -> "PUR").
    private String billIdPrefix(String orderType) {
        if (orderType == null) return "INV";
        return switch (orderType.toUpperCase()) {
            case "EXPORT" -> "EXP";
            case "PURCHASE" -> "PUR";
            case "MULTISTATE" -> "MST";
            default -> "INV"; // DOMESTIC, REPAIR
        };
    }

    // Header-only fields, shared by both the full (with items) and summary (list) mappers.
    private BillDTO mapHeaderToDTO(Bill bill) {
        BillDTO dto = new BillDTO();
        dto.setId(bill.getId());
        dto.setType(bill.getType());
        dto.setOrderType(bill.getOrderType());

        dto.setLutNumber(bill.getLutNumber());
        dto.setIecCode(bill.getIecCode());
        dto.setAdCode(bill.getAdCode());
        dto.setExchangeRate(bill.getExchangeRate());
        dto.setPortOfLoading(bill.getPortOfLoading());
        dto.setPortOfDischarge(bill.getPortOfDischarge());
        dto.setConsigneeVat(bill.getConsigneeVat());

        dto.setIncoterms(bill.getIncoterms());
        dto.setModeOfTransport(bill.getModeOfTransport());
        dto.setVesselFlightNo(bill.getVesselFlightNo());
        dto.setBillOfLadingNo(bill.getBillOfLadingNo());
        dto.setShippingBillNo(bill.getShippingBillNo());
        dto.setLetExportOrder(bill.getLetExportOrder());
        dto.setPackingDetails(bill.getPackingDetails());
        dto.setGrossWeightPacked(bill.getGrossWeightPacked());
        dto.setCountryOfOrigin(bill.getCountryOfOrigin());
        dto.setCountryOfDestination(bill.getCountryOfDestination());
        dto.setFreightCharges(bill.getFreightCharges());
        dto.setInsuranceCharges(bill.getInsuranceCharges());
        dto.setConsigneeAddress(bill.getConsigneeAddress());
        dto.setConsigneeCountry(bill.getConsigneeCountry());

        dto.setBuyerGstin(bill.getBuyerGstin());
        dto.setBuyerPan(bill.getBuyerPan());
        dto.setBuyerState(bill.getBuyerState());
        dto.setBuyerStateCode(bill.getBuyerStateCode());
        dto.setIsSez(bill.getIsSez());
        dto.setSupplyType(bill.getSupplyType());
        dto.setCgst(bill.getCgst());
        dto.setSgst(bill.getSgst());
        dto.setIgst(bill.getIgst());
        dto.setUtgst(bill.getUtgst());

        dto.setBillCategory(bill.getBillCategory());
        dto.setExchangeReceipt(bill.getExchangeReceipt());
        dto.setDate(bill.getDate());
        dto.setCustomer(bill.getCustomer());
        dto.setPhone(bill.getPhone());
        dto.setTotal(bill.getTotal());
        dto.setGst(bill.getGst());
        dto.setStatus(bill.getStatus());
        return dto;
    }

    // Used by the bill list — deliberately skips bill.getItems() (see getBills() comment).
    private BillDTO mapToSummaryDTO(Bill bill) {
        return mapHeaderToDTO(bill);
    }

    private BillDTO mapToDTO(Bill bill) {
        BillDTO dto = mapHeaderToDTO(bill);

        List<BillItemDTO> itemDTOs = bill.getItems().stream().map(item -> {
            BillItemDTO itemDTO = new BillItemDTO();
            itemDTO.setId(item.getId()); // Add this line!
            itemDTO.setName(item.getName());
            itemDTO.setCode(item.getCode());
            itemDTO.setHsnCode(item.getHsnCode());
            itemDTO.setPurity(item.getPurity());
            itemDTO.setWeight(item.getWeight());
            itemDTO.setQuantity(item.getQuantity());
            itemDTO.setMetalType(item.getMetalType() != null ? item.getMetalType().name() : null);
            itemDTO.setProductId(item.getProductId());

            itemDTO.setOldWeight(item.getOldWeight());
            itemDTO.setOldPrice(item.getOldPrice());
            itemDTO.setGstPercent(item.getGstPercent());
            itemDTO.setMetalGstPercent(item.getMetalGstPercent());
            itemDTO.setMakingGstPercent(item.getMakingGstPercent());
            itemDTO.setStoneGstPercent(item.getStoneGstPercent());
            itemDTO.setRate(item.getRate());

            itemDTO.setStoneValue(item.getStoneValue());
            itemDTO.setWastagePercent(item.getWastagePercent());
            itemDTO.setLaborAmount(item.getLaborAmount());
            itemDTO.setMakingPercent(item.getMakingPercent());

            itemDTO.setMrp(item.getMrp());
            itemDTO.setFobUsd(item.getFobUsd());
            return itemDTO;
        }).collect(Collectors.toList());

        dto.setItems(itemDTOs);
        return dto;
    }

    public BillDTO getBillById(String id) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + id));
        return mapToDTO(bill);
    }
}
