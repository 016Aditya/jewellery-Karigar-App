package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.*;
import com.goldproject.goldproject.entity.BillItem;
import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.entity.KarigarJob;
import com.goldproject.goldproject.repository.BillItemRepository;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import com.goldproject.goldproject.repository.KarigarJobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChartService {

    @Autowired
    private KarigarJobRepository karigarJobRepository;
    @Autowired
    private FullTimeKarigarRepository fullTimeKarigarRepository;
    @Autowired
    private BillItemRepository billItemRepository;

    /**
     * Fetches job volume statistics per karigar for a specific month and year.
     * If year or month are null, it defaults to the current date.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<KarigarJobVolumeDTO> getKarigarJobVolume(Integer year, Integer month) {
        LocalDate currentDate = LocalDate.now();

        int targetYear = (year != null) ? year : currentDate.getYear();
        int targetMonth = (month != null) ? month : currentDate.getMonthValue();

        return karigarJobRepository.getKarigarJobVolumeByMonth(targetYear, targetMonth);
    }

    /**
     * Fetches metal issue vs return data.
     * Defaults to the 1st of the current month to today if dates are null.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<MetalWeightChartDTO> getMetalWeightVsReturn(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            startDate = today.withDayOfMonth(1); // 1st day of current month
            endDate = today.withDayOfMonth(today.lengthOfMonth()); // Last day of current month
        }
        return karigarJobRepository.getMetalWeightVsReturnByDateRange(startDate, endDate);
    }

    /**
     * Fetches the Ghata trend over time.
     * Defaults to the last 6 months if dates are null.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<GhataTrendDTO> getGhataTrend(LocalDate startDate, LocalDate endDate, String karigarName) {
        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            endDate = today; // Up to today
            startDate = today.minusMonths(6).withDayOfMonth(1); // Last 6 months, starting from the 1st
        }

        return karigarJobRepository.getGhataTrend(startDate, endDate, karigarName);
    }

    /**
     * Calculates the average Turnaround Time (TAT) per karigar.
     * @param targetTatDays The expected TAT (e.g., 3 days for rings, 7 days for chains). Default is 5.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<TurnaroundTimeDTO> getTurnaroundTimeStats(LocalDate startDate, LocalDate endDate, Integer targetTatDays) {
        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            startDate = today.minusMonths(1); // Default to last 1 month
            endDate = today;
        }

        int target = (targetTatDays != null) ? targetTatDays : 5; // Default target is 5 days if not provided

        List<KarigarJob> completedJobs = karigarJobRepository.findCompletedJobsForTatCalculations(startDate, endDate);

        // Group jobs by Karigar Name
        Map<String, List<KarigarJob>> jobsByKarigar = completedJobs.stream()
                .collect(Collectors.groupingBy(KarigarJob::getKarigarName));

        List<TurnaroundTimeDTO> tatList = new ArrayList<>();

        for (Map.Entry<String, List<KarigarJob>> entry : jobsByKarigar.entrySet()) {
            String karigarName = entry.getKey();
            List<KarigarJob> jobs = entry.getValue();

            // Calculate the total days taken for all jobs by this karigar
            long totalDaysTaken = 0;
            for (KarigarJob job : jobs) {
                long days = ChronoUnit.DAYS.between(job.getDateIssued(), job.getDateReturned());
                // Handle same-day delivery (0 days) by ensuring it doesn't break logic, treating as 0 or 1 based on your business rule.
                totalDaysTaken += Math.max(0, days);
            }

            // Calculate Average
            double averageDays = (double) totalDaysTaken / jobs.size();

            // Determine the Color Code based on your specification
            String colorCode;
            double daysOver = averageDays - target;

            if (daysOver <= 0) {
                colorCode = "GREEN"; // On time or early
            } else if (daysOver <= 3) {
                colorCode = "AMBER"; // 1-3 days late
            } else {
                colorCode = "RED";   // 3+ days late
            }

            tatList.add(new TurnaroundTimeDTO(karigarName, averageDays, target, (long) jobs.size(), colorCode));
        }

        // Optional: Sort so the worst offenders (longest TAT) are at the top of the chart
        tatList.sort((a, b) -> Double.compare(b.getAverageTurnaroundDays(), a.getAverageTurnaroundDays()));

        return tatList;
    }

    /**
     * Gets a list of unique karigars for the frontend dropdown.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName")
    public List<KarigarLookupDTO> getKarigarLookup() {
        return karigarJobRepository.findDistinctKarigarNames().stream()
                .map(KarigarLookupDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Calculates the 0-100 productivity scores for the Radar Chart.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<ProductivityScoreDTO> getKarigarProductivityScores(
            List<String> karigarNames, LocalDate startDate, LocalDate endDate, Integer targetTatDays) {

        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            startDate = today.withDayOfMonth(1); // Default to current month
            endDate = today.withDayOfMonth(today.lengthOfMonth());
        }

        int tatLimit = (targetTatDays != null) ? targetTatDays : 5; // Default 5 days TAT
        int TARGET_MONTHLY_VOLUME = 50; // Set what constitutes a "100% score" for volume

        List<KarigarJob> jobs = karigarJobRepository.findJobsByKarigarNamesAndDateRange(karigarNames, startDate, endDate);

        Map<String, List<KarigarJob>> jobsByKarigar = jobs.stream()
                .collect(Collectors.groupingBy(KarigarJob::getKarigarName));

        List<ProductivityScoreDTO> scores = new ArrayList<>();

        for (String karigarName : karigarNames) {
            List<KarigarJob> karigarJobs = jobsByKarigar.getOrDefault(karigarName, new ArrayList<>());

            if (karigarJobs.isEmpty()) {
                // If they have no jobs in this period, return 0 for all
                scores.add(new ProductivityScoreDTO(karigarName, 0.0, 0.0, 0.0, 0.0, 0.0));
                continue;
            }

            double onTimeCount = 0;
            double totalIssued = 0;
            double totalReturned = 0;
            double totalAllowedWastage = 0;
            double jobsWithinGhata = 0;
            int completedJobsCount = 0;

            for (KarigarJob job : karigarJobs) {
                // Volume & Status tracking
                if ("Completed".equalsIgnoreCase(job.getStatus())) {
                    completedJobsCount++;

                    // On-Time Calculation
                    if (job.getDateReturned() != null && job.getDateIssued() != null) {
                        long daysTaken = java.time.temporal.ChronoUnit.DAYS.between(job.getDateIssued(), job.getDateReturned());
                        if (daysTaken <= tatLimit) onTimeCount++;
                    }
                }

                // Metal Tracking
                double issued = job.getEstimatedMetalRequired() != null ? job.getEstimatedMetalRequired().doubleValue() : 0.0;
                double finished = job.getFinishedWeight() != null ? job.getFinishedWeight().doubleValue() : 0.0;
                double scrap = job.getScrapReturned() != null ? job.getScrapReturned().doubleValue() : 0.0;
                double expectedWastagePct = job.getExpectedWastagePercent() != null ? job.getExpectedWastagePercent().doubleValue() : 0.0;

                double allowedWastage = (issued * expectedWastagePct) / 100.0;
                double returned = finished + scrap;
                double loss = issued - returned;

                totalIssued += issued;
                totalReturned += returned;
                totalAllowedWastage += allowedWastage;

                // Ghata check: Did this specific job stay within allowed wastage?
                if (loss <= allowedWastage) {
                    jobsWithinGhata++;
                }
            }

            // --- NORMALIZE SCORES (0 to 100) ---

            // 1. On Time Score (% of completed jobs delivered on time)
            double onTimeScore = completedJobsCount == 0 ? 0.0 : (onTimeCount / completedJobsCount) * 100;

            // 2. Metal Accuracy Score
            double expectedReturn = totalIssued - totalAllowedWastage;
            double accuracyScore = totalIssued == 0 ? 100.0 : (totalReturned / expectedReturn) * 100;
            accuracyScore = Math.min(100.0, accuracyScore); // Cap at 100%

            // 3. Job Volume Score (Measured against a target, e.g., 50 jobs a month = 100%)
            double volumeScore = Math.min(100.0, ((double) karigarJobs.size() / TARGET_MONTHLY_VOLUME) * 100);

            // 4. Ghata Control Score (% of jobs that had no excess loss)
            double ghataScore = (jobsWithinGhata / karigarJobs.size()) * 100;

            // 5. Rework Rate Score (Mocked to 100 for now. Add DB column later to calculate real rate)
            double reworkScore = 100.0;

            scores.add(new ProductivityScoreDTO(
                    karigarName,
                    Math.round(onTimeScore * 10.0) / 10.0,
                    Math.round(accuracyScore * 10.0) / 10.0,
                    Math.round(volumeScore * 10.0) / 10.0,
                    Math.round(ghataScore * 10.0) / 10.0,
                    reworkScore
            ));
        }

        return scores;
    }

    /**
     * Calculates the Monthly Wages Paid for both In-House (Fixed) and Outsourced (Piece-Rate) Karigars.
     * @param filterType "ALL", "IN_HOUSE", or "OUTSOURCED"
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<KarigarWagePayoutDTO> getWagePayout(LocalDate startDate, LocalDate endDate, String filterType) {

        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            endDate = today.withDayOfMonth(today.lengthOfMonth());
            startDate = today.minusMonths(5).withDayOfMonth(1);
        }

        String type = (filterType != null) ? filterType.toUpperCase() : "ALL";

        // 1. Get full-time karigars and create a quick lookup map
        List<FullTimeKarigar> fullTimeList = fullTimeKarigarRepository.findByIsActiveTrue();
        Map<String, FullTimeKarigar> inHouseMap = fullTimeList.stream()
                .collect(Collectors.toMap(FullTimeKarigar::getName, k -> k));

        // 2. Fetch ALL completed jobs in the date range (needed to calculate outsourced wages)
        List<KarigarJob> allJobs = karigarJobRepository.findCompletedJobsByDateRange(startDate, endDate);

        // Group jobs by Year -> Month -> KarigarName -> Sum of Gross Wages
        Map<Integer, Map<Integer, Map<String, Double>>> workValueByMonthAndKarigar = new HashMap<>();

        for (KarigarJob job : allJobs) {
            if (job.getDateReturned() != null && job.getGrossWages() != null) {
                int year = job.getDateReturned().getYear();
                int month = job.getDateReturned().getMonthValue();
                String name = job.getKarigarName();
                double wages = job.getGrossWages().doubleValue();

                workValueByMonthAndKarigar
                        .computeIfAbsent(year, y -> new HashMap<>())
                        .computeIfAbsent(month, m -> new HashMap<>())
                        .merge(name, wages, Double::sum);
            }
        }

        List<KarigarWagePayoutDTO> payoutList = new ArrayList<>();

        java.time.YearMonth currentMonth = java.time.YearMonth.from(startDate);
        java.time.YearMonth endMonth = java.time.YearMonth.from(endDate);

        // 3. Iterate through each month to build the chart data
        while (!currentMonth.isAfter(endMonth)) {
            int year = currentMonth.getYear();
            int month = currentMonth.getMonthValue();
            String monthName = currentMonth.getMonth().name();

            Map<String, Double> thisMonthJobs = workValueByMonthAndKarigar
                    .getOrDefault(year, new HashMap<>())
                    .getOrDefault(month, new HashMap<>());

            // Process IN-HOUSE Karigars (Fixed Monthly Wage)
            if (type.equals("ALL") || type.equals("IN_HOUSE")) {
                for (FullTimeKarigar karigar : fullTimeList) {

                    // Check if the karigar was actually employed in this month
                    boolean wasEmployedThisMonth = true;
                    if (karigar.getJoiningDate() != null) {
                        java.time.YearMonth joiningMonth = java.time.YearMonth.from(karigar.getJoiningDate());
                        if (currentMonth.isBefore(joiningMonth)) {
                            wasEmployedThisMonth = false;
                        }
                    }

                    // Only add salary expense if they were employed
                    if (wasEmployedThisMonth) {
                        double wagesPaid = karigar.getMonthlySalary() != null ? karigar.getMonthlySalary() : 0.0;
                        payoutList.add(new KarigarWagePayoutDTO(
                                year, month, monthName, karigar.getName(), "IN_HOUSE", wagesPaid
                        ));
                    }
                }
            }

            // Process OUTSOURCED Karigars (Wage per work completed this month)
            if (type.equals("ALL") || type.equals("OUTSOURCED")) {
                for (Map.Entry<String, Double> entry : thisMonthJobs.entrySet()) {
                    String karigarName = entry.getKey();

                    // If they are not in the in-house map, they are outsourced
                    if (!inHouseMap.containsKey(karigarName)) {
                        double wagesPaid = entry.getValue();

                        payoutList.add(new KarigarWagePayoutDTO(
                                year, month, monthName, karigarName, "OUTSOURCED", wagesPaid
                        ));
                    }
                }
            }

            currentMonth = currentMonth.plusMonths(1);
        }

        return payoutList;
    }
    /**
     * Calculates Wage per Gram processed for In-House and Outsourced Karigars.
     * @param targetWage Target cost per gram (e.g., 35.0)
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<WagePerGramDTO> getWagePerGramStats(LocalDate startDate, LocalDate endDate, String filterType, Double targetWage) {

        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            startDate = today.withDayOfMonth(1); // Default to current month
            endDate = today.withDayOfMonth(today.lengthOfMonth());
        }

        String type = (filterType != null) ? filterType.toUpperCase() : "ALL";
        double target = (targetWage != null) ? targetWage : 35.0; // Default threshold

        // Calculate how many months this date range spans to correctly allocate full-time salaries
        long monthsSpanned = java.time.temporal.ChronoUnit.MONTHS.between(
                java.time.YearMonth.from(startDate),
                java.time.YearMonth.from(endDate)
        ) + 1;

        // 1. Get full-time karigars lookup map
        List<FullTimeKarigar> fullTimeList = fullTimeKarigarRepository.findByIsActiveTrue();
        Map<String, FullTimeKarigar> inHouseMap = fullTimeList.stream()
                .collect(Collectors.toMap(FullTimeKarigar::getName, k -> k));

        // 2. Fetch all completed jobs in the date range
        List<KarigarJob> allJobs = karigarJobRepository.findCompletedJobsByDateRange(startDate, endDate);

        // Group jobs by KarigarName to calculate total grams and outsourced wages
        Map<String, Double> gramsProcessedByName = new HashMap<>();
        Map<String, Double> outsourcedWagesByName = new HashMap<>();

        for (KarigarJob job : allJobs) {
            String name = job.getKarigarName();
            double issuedGrams = job.getEstimatedMetalRequired() != null ? job.getEstimatedMetalRequired().doubleValue() : 0.0;
            double grossWages = job.getGrossWages() != null ? job.getGrossWages().doubleValue() : 0.0;

            gramsProcessedByName.merge(name, issuedGrams, Double::sum);
            outsourcedWagesByName.merge(name, grossWages, Double::sum);
        }

        List<WagePerGramDTO> resultList = new ArrayList<>();

        // 3. Process IN-HOUSE Karigars (Fixed Salary)
        if (type.equals("ALL") || type.equals("IN_HOUSE")) {
            for (FullTimeKarigar karigar : fullTimeList) {
                String name = karigar.getName();
                // Total salary for the selected date range
                double totalWage = (karigar.getMonthlySalary() != null ? karigar.getMonthlySalary() : 0.0) * monthsSpanned;
                double totalGrams = gramsProcessedByName.getOrDefault(name, 0.0);

                double wagePerGram = totalGrams > 0 ? (totalWage / totalGrams) : 0.0;
                String color = determineColorCode(wagePerGram, target, totalGrams);

                resultList.add(new WagePerGramDTO(
                        name, "IN_HOUSE", totalWage, totalGrams,
                        Math.round(wagePerGram * 100.0) / 100.0, target, color
                ));
            }
        }

        // 4. Process OUTSOURCED Karigars (Piece-Rate)
        if (type.equals("ALL") || type.equals("OUTSOURCED")) {
            for (Map.Entry<String, Double> entry : gramsProcessedByName.entrySet()) {
                String name = entry.getKey();

                // If not in the in-house map, treat as outsourced
                if (!inHouseMap.containsKey(name)) {
                    double totalGrams = entry.getValue();
                    double totalWage = outsourcedWagesByName.getOrDefault(name, 0.0);

                    double wagePerGram = totalGrams > 0 ? (totalWage / totalGrams) : 0.0;
                    String color = determineColorCode(wagePerGram, target, totalGrams);

                    resultList.add(new WagePerGramDTO(
                            name, "OUTSOURCED", totalWage, totalGrams,
                            Math.round(wagePerGram * 100.0) / 100.0, target, color
                    ));
                }
            }
        }

        // Sort by highest cost per gram first to immediately highlight inefficiencies
        resultList.sort((a, b) -> Double.compare(b.getWagePerGram(), a.getWagePerGram()));

        return resultList;
    }

    /**
     * Helper to determine color coding based on threshold.
     */
    private String determineColorCode(double wagePerGram, double target, double totalGrams) {
        if (totalGrams == 0) return "RED"; // Paid salary but processed 0 grams (Infinite cost)
        if (wagePerGram > target) return "RED";
        if (wagePerGram == target) return "AMBER";
        return "GREEN"; // Below target cost
    }
    /**
     * Calculates Wages Paid vs. Job Value Produced.
     * @param filterType "ALL", "IN_HOUSE", or "OUTSOURCED"
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<WageVsValueDTO> getWagesVsJobValue(LocalDate startDate, LocalDate endDate, String filterType) {

        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            endDate = today.withDayOfMonth(today.lengthOfMonth());
            startDate = today.minusMonths(5).withDayOfMonth(1);
        }

        String type = (filterType != null) ? filterType.toUpperCase() : "ALL";

        // 1. Get full-time karigars and create a lookup map
        List<FullTimeKarigar> fullTimeList = fullTimeKarigarRepository.findByIsActiveTrue();
        Map<String, FullTimeKarigar> inHouseMap = fullTimeList.stream()
                .collect(Collectors.toMap(FullTimeKarigar::getName, k -> k));

        // 2. Calculate actual salary paid to In-House karigars for the date range
        Map<String, Double> inHouseSalaryPaid = new HashMap<>();
        java.time.YearMonth currentMonth = java.time.YearMonth.from(startDate);
        java.time.YearMonth endMonth = java.time.YearMonth.from(endDate);

        while (!currentMonth.isAfter(endMonth)) {
            for (FullTimeKarigar karigar : fullTimeList) {
                boolean wasEmployed = true;
                if (karigar.getJoiningDate() != null) {
                    java.time.YearMonth joiningMonth = java.time.YearMonth.from(karigar.getJoiningDate());
                    if (currentMonth.isBefore(joiningMonth)) {
                        wasEmployed = false;
                    }
                }

                if (wasEmployed) {
                    double salary = karigar.getMonthlySalary() != null ? karigar.getMonthlySalary() : 0.0;
                    inHouseSalaryPaid.merge(karigar.getName(), salary, Double::sum);
                }
            }
            currentMonth = currentMonth.plusMonths(1);
        }

        // 3. Fetch all completed jobs WITH BillItems
        List<KarigarJob> allJobs = karigarJobRepository.findCompletedJobsWithBillItemsByDateRange(startDate, endDate);

        Map<String, Double> jobValueByName = new HashMap<>();
        Map<String, Double> outsourcedWagesByName = new HashMap<>();

        for (KarigarJob job : allJobs) {
            String name = job.getKarigarName();

            // Tally up outsourced wages
            double grossWages = job.getGrossWages() != null ? job.getGrossWages().doubleValue() : 0.0;
            outsourcedWagesByName.merge(name, grossWages, Double::sum);

            // Calculate the Revenue Value of the Job from BillItem
            double jobValue = 0.0;
            if (job.getBillItem() != null) {
                BillItem item = job.getBillItem();
                double weight = item.getWeight() != null ? item.getWeight().doubleValue() : 0.0;
                double rate = item.getRate() != null ? item.getRate().doubleValue() : 0.0;
                double makingPct = item.getMakingPercent() != null ? item.getMakingPercent().doubleValue() : 0.0;
                double laborAmount = item.getLaborAmount() != null ? item.getLaborAmount().doubleValue() : 0.0;

                // Making Charge = (Weight * Rate * Making%) + Flat Labor amount
                jobValue = (weight * rate * (makingPct / 100.0)) + laborAmount;
            }
            jobValueByName.merge(name, jobValue, Double::sum);
        }

        List<WageVsValueDTO> resultList = new ArrayList<>();

        // 4. Build Data for IN-HOUSE Karigars
        if (type.equals("ALL") || type.equals("IN_HOUSE")) {
            for (FullTimeKarigar karigar : fullTimeList) {
                String name = karigar.getName();
                double totalWages = inHouseSalaryPaid.getOrDefault(name, 0.0);
                double totalJobValue = jobValueByName.getOrDefault(name, 0.0);
                double netProfit = totalJobValue - totalWages;

                String wagesBarColor = totalWages > totalJobValue ? "RED" : "AMBER";

                resultList.add(new WageVsValueDTO(
                        name, "IN_HOUSE",
                        Math.round(totalWages * 100.0) / 100.0,
                        Math.round(totalJobValue * 100.0) / 100.0,
                        Math.round(netProfit * 100.0) / 100.0,
                        wagesBarColor
                ));
            }
        }

        // 5. Build Data for OUTSOURCED Karigars
        if (type.equals("ALL") || type.equals("OUTSOURCED")) {
            for (Map.Entry<String, Double> entry : outsourcedWagesByName.entrySet()) {
                String name = entry.getKey();

                if (!inHouseMap.containsKey(name)) {
                    double totalWages = entry.getValue();
                    double totalJobValue = jobValueByName.getOrDefault(name, 0.0);
                    double netProfit = totalJobValue - totalWages;

                    String wagesBarColor = totalWages > totalJobValue ? "RED" : "AMBER";

                    resultList.add(new WageVsValueDTO(
                            name, "OUTSOURCED",
                            Math.round(totalWages * 100.0) / 100.0,
                            Math.round(totalJobValue * 100.0) / 100.0,
                            Math.round(netProfit * 100.0) / 100.0,
                            wagesBarColor
                    ));
                }
            }
        }

        // Sort by net profit descending (most profitable karigars first)
        resultList.sort((a, b) -> Double.compare(b.getNetProfit(), a.getNetProfit()));

        return resultList;
    }
    /**
     * Calculates the Advance vs. Balance Ledger for In-House and Outsourced Karigars.
     * @param filterType "ALL", "IN_HOUSE", or "OUTSOURCED"
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<KarigarBalanceLedgerDTO> getAdvanceAndBalanceLedger(LocalDate startDate, LocalDate endDate, String filterType) {

        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            startDate = today.withDayOfMonth(1); // Default to current month
            endDate = today.withDayOfMonth(today.lengthOfMonth());
        }

        String type = (filterType != null) ? filterType.toUpperCase() : "ALL";

        // Calculate months spanned to accurately tally Full-Time salaries
        long monthsSpanned = java.time.temporal.ChronoUnit.MONTHS.between(
                java.time.YearMonth.from(startDate),
                java.time.YearMonth.from(endDate)
        ) + 1;

        // 1. Get full-time karigars and create a lookup map
        List<FullTimeKarigar> fullTimeList = fullTimeKarigarRepository.findByIsActiveTrue();
        Map<String, FullTimeKarigar> inHouseMap = fullTimeList.stream()
                .collect(Collectors.toMap(FullTimeKarigar::getName, k -> k));

        // 2. Fetch jobs for Wages Earned (based on dateReturned)
        List<KarigarJob> completedJobs = karigarJobRepository.findCompletedJobsByDateRange(startDate, endDate);
        Map<String, Double> outsourcedWagesByName = new HashMap<>();

        for (KarigarJob job : completedJobs) {
            double wages = job.getGrossWages() != null ? job.getGrossWages().doubleValue() : 0.0;
            outsourcedWagesByName.merge(job.getKarigarName(), wages, Double::sum);
        }

        // 3. Fetch jobs for Advances Given (based on dateIssued)
        List<KarigarJob> issuedJobs = karigarJobRepository.findJobsIssuedByDateRange(startDate, endDate);
        Map<String, Double> advancesByName = new HashMap<>();

        for (KarigarJob job : issuedJobs) {
            double advance = job.getAdvancePayment() != null ? job.getAdvancePayment().doubleValue() : 0.0;
            advancesByName.merge(job.getKarigarName(), advance, Double::sum);
        }

        List<KarigarBalanceLedgerDTO> ledgerList = new ArrayList<>();

        // 4. Process IN-HOUSE Karigars
        if (type.equals("ALL") || type.equals("IN_HOUSE")) {
            for (FullTimeKarigar karigar : fullTimeList) {
                String name = karigar.getName();

                // Wages Earned: Fixed Salary * Valid Months
                double wagesEarned = (karigar.getMonthlySalary() != null ? karigar.getMonthlySalary() : 0.0) * monthsSpanned;

                // Advance Given: Sum of advances on all jobs issued to them this month
                double advanceGiven = advancesByName.getOrDefault(name, 0.0);

                double netBalance = wagesEarned - advanceGiven;
                String colorCode = netBalance >= 0 ? "GREEN" : "RED";

                ledgerList.add(new KarigarBalanceLedgerDTO(
                        name, "IN_HOUSE",
                        Math.round(wagesEarned * 100.0) / 100.0,
                        Math.round(advanceGiven * 100.0) / 100.0,
                        Math.round(netBalance * 100.0) / 100.0,
                        colorCode
                ));
            }
        }

        // 5. Process OUTSOURCED Karigars
        if (type.equals("ALL") || type.equals("OUTSOURCED")) {
            // We need a unique set of all outsourced karigar names from BOTH wages and advances
            Set<String> outsourcedNames = new HashSet<>();
            outsourcedNames.addAll(outsourcedWagesByName.keySet());
            outsourcedNames.addAll(advancesByName.keySet());

            for (String name : outsourcedNames) {
                if (!inHouseMap.containsKey(name)) {
                    // Wages Earned: Sum of piece-rate jobs completed
                    double wagesEarned = outsourcedWagesByName.getOrDefault(name, 0.0);

                    // Advance Given: Sum of advances on jobs issued
                    double advanceGiven = advancesByName.getOrDefault(name, 0.0);

                    double netBalance = wagesEarned - advanceGiven;
                    String colorCode = netBalance >= 0 ? "GREEN" : "RED";

                    ledgerList.add(new KarigarBalanceLedgerDTO(
                            name, "OUTSOURCED",
                            Math.round(wagesEarned * 100.0) / 100.0,
                            Math.round(advanceGiven * 100.0) / 100.0,
                            Math.round(netBalance * 100.0) / 100.0,
                            colorCode
                    ));
                }
            }
        }

        // Sort so the biggest risks (largest negative balances) are at the top of the chart
        ledgerList.sort((a, b) -> Double.compare(a.getNetBalance(), b.getNetBalance()));

        return ledgerList;
    }

    /**
     * Calculates the Month-over-Month Wage Trend.
     * @param karigars Optional list of specific Karigar names to filter the chart
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName + T(java.util.Arrays).toString(#root.args)")
    public List<WageTrendDTO> getWageTrendStats(LocalDate startDate, LocalDate endDate, List<String> karigars) {

        // Default to a 12-month trend if dates are not provided
        if (startDate == null || endDate == null) {
            LocalDate today = LocalDate.now();
            endDate = today.withDayOfMonth(today.lengthOfMonth());
            startDate = today.minusMonths(11).withDayOfMonth(1); // 12 months total
        }

        // 1. Fetch In-House Karigars & Filter if requested
        List<FullTimeKarigar> fullTimeList = fullTimeKarigarRepository.findByIsActiveTrue();
        if (karigars != null && !karigars.isEmpty()) {
            fullTimeList = fullTimeList.stream()
                    .filter(k -> karigars.contains(k.getName()))
                    .collect(Collectors.toList());
        }

        Map<String, FullTimeKarigar> inHouseMap = fullTimeList.stream()
                .collect(Collectors.toMap(FullTimeKarigar::getName, k -> k));

        // 2. Fetch all completed jobs in the date range
        List<KarigarJob> allJobs = karigarJobRepository.findCompletedJobsByDateRange(startDate, endDate);

        if (karigars != null && !karigars.isEmpty()) {
            allJobs = allJobs.stream()
                    .filter(job -> karigars.contains(job.getKarigarName()))
                    .collect(Collectors.toList());
        }

        // 3. Identify all unique Outsourced Karigars who worked in this period
        Set<String> outsourcedNames = allJobs.stream()
                .map(KarigarJob::getKarigarName)
                .filter(name -> !inHouseMap.containsKey(name))
                .collect(Collectors.toSet());

        // Group jobs by Year -> Month -> KarigarName -> Sum of Gross Wages
        Map<Integer, Map<Integer, Map<String, Double>>> wagesByMonthAndKarigar = new HashMap<>();

        for (KarigarJob job : allJobs) {
            if (job.getDateReturned() != null && job.getGrossWages() != null) {
                int year = job.getDateReturned().getYear();
                int month = job.getDateReturned().getMonthValue();
                String name = job.getKarigarName();
                double wages = job.getGrossWages().doubleValue();

                wagesByMonthAndKarigar
                        .computeIfAbsent(year, y -> new HashMap<>())
                        .computeIfAbsent(month, m -> new HashMap<>())
                        .merge(name, wages, Double::sum);
            }
        }

        List<WageTrendDTO> trendList = new ArrayList<>();

        java.time.YearMonth currentMonth = java.time.YearMonth.from(startDate);
        java.time.YearMonth endMonth = java.time.YearMonth.from(endDate);

        // 4. Generate data points for every single month in the range
        while (!currentMonth.isAfter(endMonth)) {
            int year = currentMonth.getYear();
            int month = currentMonth.getMonthValue();
            String monthName = currentMonth.getMonth().name();

            Map<String, Double> thisMonthJobs = wagesByMonthAndKarigar
                    .getOrDefault(year, new HashMap<>())
                    .getOrDefault(month, new HashMap<>());

            // Process IN-HOUSE Karigars (Fixed Salary)
            for (FullTimeKarigar karigar : fullTimeList) {
                boolean wasEmployedThisMonth = true;

                // Only plot their salary if they were employed during this month
                if (karigar.getJoiningDate() != null) {
                    java.time.YearMonth joiningMonth = java.time.YearMonth.from(karigar.getJoiningDate());
                    if (currentMonth.isBefore(joiningMonth)) {
                        wasEmployedThisMonth = false;
                    }
                }

                double wagePaid = 0.0;
                if (wasEmployedThisMonth) {
                    wagePaid = karigar.getMonthlySalary() != null ? karigar.getMonthlySalary() : 0.0;
                }

                // Add point even if 0, so the line chart doesn't break
                trendList.add(new WageTrendDTO(
                        karigar.getName(), "IN_HOUSE", year, month, monthName, wagePaid
                ));
            }

            // Process OUTSOURCED Karigars (Wage per work completed)
            for (String karigarName : outsourcedNames) {
                // If they didn't work this month, it defaults to 0.0 to drop the line down accurately
                double wagePaid = thisMonthJobs.getOrDefault(karigarName, 0.0);

                trendList.add(new WageTrendDTO(
                        karigarName, "OUTSOURCED", year, month, monthName, wagePaid
                ));
            }

            currentMonth = currentMonth.plusMonths(1);
        }

        return trendList;
    }

    /**
     * Top 5 selling products per metal (GOLD/SILVER/PLATINUM) over the last 6 months,
     * with their monthly sales volume — used to plot a stacked bar chart of sales
     * volume per month, one stacked segment per metal.
     */
    @Cacheable(cacheNames = "chartData", key = "#root.methodName")
    public List<TopSellingItemDTO> getTopSellingItemsByMetal() {
        LocalDate start = LocalDate.now().minusMonths(5).withDayOfMonth(1);

        // 1. Total quantity per metal+product over the window — small aggregated result,
        // used only to rank and pick the top 5 sellers per metal.
        Map<String, List<BillItemRepository.MetalItemTotalProjection>> totalsByMetal =
                billItemRepository.sumQuantityByMetalAndName(start).stream()
                        .collect(Collectors.groupingBy(BillItemRepository.MetalItemTotalProjection::getMetalType));

        Map<String, Set<String>> top5NamesByMetal = new HashMap<>();
        for (Map.Entry<String, List<BillItemRepository.MetalItemTotalProjection>> entry : totalsByMetal.entrySet()) {
            Set<String> top5 = entry.getValue().stream()
                    .sorted((a, b) -> Long.compare(b.getQty(), a.getQty()))
                    .limit(5)
                    .map(BillItemRepository.MetalItemTotalProjection::getName)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            top5NamesByMetal.put(entry.getKey(), top5);
        }

        // 2. Filter the monthly breakdown down to just those top-5-per-metal products.
        DateTimeFormatter monthKeyFmt = DateTimeFormatter.ofPattern("yyyy-MM");
        List<TopSellingItemDTO> result = new ArrayList<>();

        for (BillItemRepository.MonthlyMetalItemProjection row : billItemRepository.sumQuantityByMonthMetalAndName(start)) {
            Set<String> top5 = top5NamesByMetal.getOrDefault(row.getMetalType(), Collections.emptySet());
            if (!top5.contains(row.getName())) continue;

            YearMonth ym = YearMonth.parse(row.getMonth(), monthKeyFmt);
            String monthLabel = ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + ym.getYear();

            result.add(new TopSellingItemDTO(row.getMonth(), monthLabel, row.getMetalType(), row.getName(), row.getQty()));
        }

        result.sort(Comparator.comparing(TopSellingItemDTO::getMonth));
        return result;
    }

    /**
     * Wipes every cached chart response — called when the user presses "Refresh Now"
     * on the dashboard, so all currently-mounted charts recompute from the DB on
     * their next fetch instead of serving up to 24h-stale data.
     */
    @CacheEvict(cacheNames = "chartData", allEntries = true)
    public void clearChartCache() {
    }

}