package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.*;
import com.goldproject.goldproject.service.ChartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/charts")
@CrossOrigin(origins = "*") // Adjust origins based on your frontend setup
public class ChartController {

    @Autowired
    private ChartService chartService;

    /**
     * API Endpoint: GET /api/charts/karigar-job-volume?year=2024&month=5
     *
     * @param year  (Optional) e.g., 2024
     * @param month (Optional) e.g., 5 for May
     * @return List of KarigarJobVolumeDTO
     */
    @GetMapping("/karigar-job-volume")
    public ResponseEntity<List<KarigarJobVolumeDTO>> getKarigarJobVolumeChartData(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {

        List<KarigarJobVolumeDTO> chartData = chartService.getKarigarJobVolume(year, month);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/metal-weight-vs-return?startDate=2024-05-01&endDate=2024-05-31
     *
     * @param startDate (Optional) Format: YYYY-MM-DD
     * @param endDate   (Optional) Format: YYYY-MM-DD
     * @return List of MetalWeightChartDTO
     */
    @GetMapping("/metal-weight-vs-return")
    public ResponseEntity<List<MetalWeightChartDTO>> getMetalWeightVsReturnData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<MetalWeightChartDTO> chartData = chartService.getMetalWeightVsReturn(startDate, endDate);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/ghata-trend?startDate=2023-11-01&endDate=2024-05-31&karigarName=Raju
     *
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param karigarName (Optional) To view a single karigar's trend
     * @return List of GhataTrendDTO points for the line chart
     */
    @GetMapping("/ghata-trend")
    public ResponseEntity<List<GhataTrendDTO>> getGhataTrendData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String karigarName) {

        List<GhataTrendDTO> chartData = chartService.getGhataTrend(startDate, endDate, karigarName);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/turnaround-time?startDate=2024-04-01&endDate=2024-05-31&targetTatDays=5
     *
     * @param startDate     (Optional) Format: YYYY-MM-DD
     * @param endDate       (Optional) Format: YYYY-MM-DD
     * @param targetTatDays (Optional) Expected days to finish. Used for coloring. Defaults to 5.
     * @return List of TurnaroundTimeDTO for the Gantt/Horizontal Bar chart
     */
    @GetMapping("/turnaround-time")
    public ResponseEntity<List<TurnaroundTimeDTO>> getTurnaroundTimeData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer targetTatDays) {

        List<TurnaroundTimeDTO> chartData = chartService.getTurnaroundTimeStats(startDate, endDate, targetTatDays);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/karigar-lookup
     * Purpose: Populates the dropdown menu for the user to select Karigars to compare.
     * @return List of unique Karigar names.
     */
    @GetMapping("/karigar-lookup")
    public ResponseEntity<List<KarigarLookupDTO>> getKarigarLookup() {
        return ResponseEntity.ok(chartService.getKarigarLookup());
    }

    /**
     * API Endpoint: GET /api/charts/productivity-score?karigars=Raju,Amit,Suresh&startDate=2024-05-01&endDate=2024-05-31
     *
     * @param karigars    (Required) Comma-separated list of Karigar names
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param targetTat   (Optional) Days allowed for TAT metric. Defaults to 5.
     * @return List of ProductivityScoreDTO for the Radar Chart
     */
    @GetMapping("/productivity-score")
    public ResponseEntity<List<ProductivityScoreDTO>> getProductivityRadarData(
            @RequestParam List<String> karigars,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer targetTat) {

        if (karigars == null || karigars.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Limit to max 3 comparisons to keep the radar chart readable
        if (karigars.size() > 3) {
            karigars = karigars.subList(0, 3);
        }

        List<ProductivityScoreDTO> chartData = chartService.getKarigarProductivityScores(karigars, startDate, endDate, targetTat);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/wage-payout-profitability?startDate=2023-12-01&endDate=2024-05-31&karigarType=ALL
     *
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param karigarType (Optional) "ALL", "IN_HOUSE", or "OUTSOURCED". Defaults to "ALL".
     */
    @GetMapping("/wage-payout-profitability")
    public ResponseEntity<List<KarigarWagePayoutDTO>> getWagePayoutProfitabilityData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String karigarType) {

        List<KarigarWagePayoutDTO> chartData = chartService.getWagePayout(startDate, endDate, karigarType);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/wage-per-gram?startDate=2024-05-01&endDate=2024-05-31&targetWage=35.0
     *
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param karigarType (Optional) "ALL", "IN_HOUSE", or "OUTSOURCED". Defaults to "ALL".
     * @param targetWage  (Optional) The target cost per gram threshold. Defaults to 35.0.
     */
    @GetMapping("/wage-per-gram")
    public ResponseEntity<List<WagePerGramDTO>> getWagePerGramData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String karigarType,
            @RequestParam(required = false) Double targetWage) {

        List<WagePerGramDTO> chartData = chartService.getWagePerGramStats(startDate, endDate, karigarType, targetWage);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/wages-vs-value?startDate=2024-01-01&endDate=2024-05-31&karigarType=ALL
     *
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param karigarType (Optional) "ALL", "IN_HOUSE", or "OUTSOURCED". Defaults to "ALL".
     */
    @GetMapping("/wages-vs-value")
    public ResponseEntity<List<WageVsValueDTO>> getWagesVsJobValueData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String karigarType) {

        List<WageVsValueDTO> chartData = chartService.getWagesVsJobValue(startDate, endDate, karigarType);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/advance-balance-ledger?startDate=2024-05-01&endDate=2024-05-31&karigarType=ALL
     *
     * @param startDate   (Optional) Format: YYYY-MM-DD
     * @param endDate     (Optional) Format: YYYY-MM-DD
     * @param karigarType (Optional) "ALL", "IN_HOUSE", or "OUTSOURCED". Defaults to "ALL".
     */
    @GetMapping("/advance-balance-ledger")
    public ResponseEntity<List<KarigarBalanceLedgerDTO>> getAdvanceBalanceLedgerData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String karigarType) {

        List<KarigarBalanceLedgerDTO> chartData = chartService.getAdvanceAndBalanceLedger(startDate, endDate, karigarType);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/wage-trend?startDate=2023-06-01&endDate=2024-05-31&karigars=Raju,Amit
     *
     * @param startDate (Optional) Format: YYYY-MM-DD
     * @param endDate   (Optional) Format: YYYY-MM-DD
     * @param karigars  (Optional) List of Karigar names to filter the lines
     * @return List of WageTrendDTO for the multi-line chart
     */
    @GetMapping("/wage-trend")
    public ResponseEntity<List<WageTrendDTO>> getWageTrendData(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) List<String> karigars) {

        List<WageTrendDTO> chartData = chartService.getWageTrendStats(startDate, endDate, karigars);
        return ResponseEntity.ok(chartData);
    }

    /**
     * API Endpoint: GET /api/charts/top-selling-items
     * Top 5 selling products per metal (GOLD/SILVER/PLATINUM) over the last 6 months,
     * with monthly sales volume for the stacked bar chart.
     */
    @GetMapping("/top-selling-items")
    public ResponseEntity<List<TopSellingItemDTO>> getTopSellingItems() {
        return ResponseEntity.ok(chartService.getTopSellingItemsByMetal());
    }

    /**
     * API Endpoint: POST /api/charts/refresh-cache
     * Clears the 24h chart data cache — called by the dashboard's "Refresh Now" button
     * so the next fetch for every visible chart recomputes from the DB.
     */
    @PostMapping("/refresh-cache")
    public ResponseEntity<Void> refreshChartCache() {
        chartService.clearChartCache();
        return ResponseEntity.ok().build();
    }
}