package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.DashboardStatsDTO;
import com.goldproject.goldproject.service.DashboardService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // GET /api/dashboard/stats — six lightweight counts for the dashboard header cards.
    // Served from a 24h in-process cache; pass refresh=true to force recomputation
    // (e.g. the user pressing "Refresh now" on the dashboard).
    @GetMapping("/stats")
    public DashboardStatsDTO getStats(@RequestParam(required = false, defaultValue = "false") boolean refresh) {
        return dashboardService.getStats(refresh);
    }
}
