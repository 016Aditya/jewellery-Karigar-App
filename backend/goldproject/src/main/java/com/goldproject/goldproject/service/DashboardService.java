package com.goldproject.goldproject.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.goldproject.goldproject.dto.DashboardStatsDTO;
import com.goldproject.goldproject.enums.KarigarType;
import com.goldproject.goldproject.repository.BillRepository;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import com.goldproject.goldproject.repository.KarigarJobRepository;
import com.goldproject.goldproject.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.Duration;

@Service
public class DashboardService {

    private static final String CACHE_KEY = "dashboard-stats";

    // Dashboard stats are the only heavy aggregate-query endpoint hit on every page
    // load, so they're cached in-process for 24h — a manual refresh (see getStats)
    // evicts and recomputes on demand rather than waiting out the TTL.
    private final Cache<String, DashboardStatsDTO> cache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofHours(24))
            .maximumSize(1)
            .build();

    private final BillRepository billRepository;
    private final KarigarJobRepository karigarJobRepository;
    private final FullTimeKarigarRepository fullTimeKarigarRepository;
    private final ProductRepository productRepository;

    public DashboardService(BillRepository billRepository,
                             KarigarJobRepository karigarJobRepository,
                             FullTimeKarigarRepository fullTimeKarigarRepository,
                             ProductRepository productRepository) {
        this.billRepository = billRepository;
        this.karigarJobRepository = karigarJobRepository;
        this.fullTimeKarigarRepository = fullTimeKarigarRepository;
        this.productRepository = productRepository;
    }

    public DashboardStatsDTO getStats(boolean forceRefresh) {
        if (forceRefresh) {
            cache.invalidate(CACHE_KEY);
        }
        return cache.get(CACHE_KEY, key -> computeStats());
    }

    private DashboardStatsDTO computeStats() {
        YearMonth currentMonth = YearMonth.now();
        LocalDate start = currentMonth.atDay(1);
        LocalDate end = currentMonth.atEndOfMonth();

        long totalOrders = billRepository.count();
        long completedThisMonth = billRepository.countCompletedOrdersBetween(start, end);
        long inProgressThisMonth = billRepository.countInProgressOrdersBetween(start, end);
        long activeKarigarTasks = karigarJobRepository.countByStatus("Assigned");
        long salariedKarigars = fullTimeKarigarRepository.countByKarigarTypeAndIsActiveTrue(KarigarType.FULL_TIME);
        long catalogueCount = productRepository.count();

        return new DashboardStatsDTO(
                totalOrders,
                completedThisMonth,
                inProgressThisMonth,
                activeKarigarTasks,
                salariedKarigars,
                catalogueCount,
                Instant.now()
        );
    }
}
