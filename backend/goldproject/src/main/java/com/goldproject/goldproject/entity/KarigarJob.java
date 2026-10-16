package com.goldproject.goldproject.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "karigar_jobs")
@Data
public class KarigarJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", unique = true, nullable = false)
    private String jobId;

    @Column(name = "karigar_name", nullable = false)
    private String karigarName;

    @Column(name = "work_type", nullable = false)
    private String workType;

    // How many of the bill item's units this job card covers (full quantity, or a
    // partial batch split across karigars). Defaults to 1 for legacy rows.
    @Column(name = "quantity")
    private Integer quantity = 1;

    // BigDecimal (not Double) — display-only figure for this job card (wastage graph/UI),
    // stored down to milligram precision so it doesn't accumulate floating-point drift.
    @Column(name = "estimated_metal_required", precision = 19, scale = 4)
    private BigDecimal estimatedMetalRequired;

    @Column(name = "gold_purity")
    private String goldPurity;

    @Column(name = "expected_wastage_percent", precision = 19, scale = 4)
    private BigDecimal expectedWastagePercent;

    @Column(name = "gross_wages", precision = 19, scale = 2)
    private BigDecimal grossWages;

    @Column(name = "date_issued")
    private LocalDate dateIssued;

    @Column(name = "date_returned")
    private LocalDate dateReturned;

    @Column(name = "finished_weight", precision = 19, scale = 4)
    private BigDecimal finishedWeight;

    @Column(name = "scrap_returned", precision = 19, scale = 4)
    private BigDecimal scrapReturned;

    @Column(nullable = false)
    private String status; // "Assigned" or "Completed"

    @Column(name="advance", precision = 19, scale = 2)
    private BigDecimal advancePayment;

    // Many-to-one, not one-to-one: a single bill item can be split across multiple job
    // cards (partial-quantity assignment — e.g. 1 of 3 units to this karigar, the
    // remaining 2 to another). Uniqueness is no longer enforced at the DB level; the
    // remaining-quantity check happens in KarigarJobService.assignJob instead.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_item_id", nullable = false)
    private BillItem billItem;

    // Strong link to the karigar this job is assigned to — many jobs can point to the
    // same karigar over time. Nullable so legacy rows (assigned before this FK existed,
    // when karigarName was a free string with no backing record) don't break.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "karigar_id")
    private FullTimeKarigar karigar;
}