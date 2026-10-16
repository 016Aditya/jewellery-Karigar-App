package com.goldproject.goldproject.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class KarigarJobDTO {
    private Long billItemId;
    private Long id;
    private String jobId;

    // karigarId is the input used to strongly link a job to a karigar record; karigarName
    // and karigarType are denormalized output, populated from that linked record.
    private Long karigarId;
    private String karigarName;
    private String karigarType;
    private String workType;
    private Integer quantity;
    private BigDecimal advancePayment;
    // Links to BillItem
    private String billId;
    private String itemCode;
    private String itemName;

    private BigDecimal estimatedMetalRequired;
    private String goldPurity;
    private BigDecimal expectedWastagePercent;
    private BigDecimal grossWages;

    private LocalDate dateIssued;
    private LocalDate dateReturned;

    private BigDecimal finishedWeight;
    private BigDecimal scrapReturned;

    private String status;
}