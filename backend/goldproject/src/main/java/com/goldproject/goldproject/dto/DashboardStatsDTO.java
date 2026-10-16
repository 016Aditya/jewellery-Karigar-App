package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class DashboardStatsDTO {
    private long totalOrders;
    private long completedOrdersThisMonth;
    private long inProgressOrdersThisMonth;
    private long activeKarigarTasks;
    private long salariedKarigars;
    private long catalogueCount;
    // When this snapshot was computed — the frontend shows this instead of re-hitting
    // the DB on every dashboard visit; a manual refresh recomputes and bumps it.
    private Instant lastUpdatedAt;
}
