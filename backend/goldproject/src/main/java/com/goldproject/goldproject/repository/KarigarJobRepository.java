package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.dto.GhataTrendDTO;
import com.goldproject.goldproject.dto.KarigarJobVolumeDTO;
import com.goldproject.goldproject.dto.MetalWeightChartDTO;
import com.goldproject.goldproject.entity.KarigarJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface KarigarJobRepository extends JpaRepository<KarigarJob, Long> {
    List<KarigarJob> findAllByOrderByIdDesc();

    // A bill item can be split across multiple job cards (partial-quantity assignment),
    // so duplicate-assignment is no longer "does a job exist for this item" but "how much
    // of its quantity is already spoken for" — a single lightweight aggregate, not a row
    // fetch, so the check stays cheap regardless of how many job cards an item ends up with.
    @Query("SELECT COALESCE(SUM(k.quantity), 0) FROM KarigarJob k WHERE k.billItem.id = :billItemId")
    int sumAssignedQuantityForBillItem(@Param("billItemId") Long billItemId);

    long countByStatus(String status);

    @Query("SELECT new com.goldproject.goldproject.dto.KarigarJobVolumeDTO(" +
            "k.karigarName, " +
            "COUNT(k.id), " +
            "SUM(CASE WHEN k.status = 'Completed' THEN 1L ELSE 0L END), " +
            "SUM(CASE WHEN k.status = 'Assigned' THEN 1L ELSE 0L END)) " +
            "FROM KarigarJob k " +
            "WHERE EXTRACT(YEAR FROM k.dateIssued) = :year " +
            "AND EXTRACT(MONTH FROM k.dateIssued) = :month " +
            "GROUP BY k.karigarName")
    List<KarigarJobVolumeDTO> getKarigarJobVolumeByMonth(@Param("year") int year, @Param("month") int month);

    @Query("SELECT new com.goldproject.goldproject.dto.MetalWeightChartDTO(" +
            "k.karigarName, " +
            "SUM(CAST(k.estimatedMetalRequired AS double)), " +
            "SUM(CAST(k.finishedWeight AS double)), " +
            "SUM(CAST(k.scrapReturned AS double)), " +
            "SUM((CAST(k.estimatedMetalRequired AS double) * CAST(k.expectedWastagePercent AS double)) / 100)) " +
            "FROM KarigarJob k " +
            "WHERE k.dateIssued BETWEEN :startDate AND :endDate " +
            "GROUP BY k.karigarName")
    List<MetalWeightChartDTO> getMetalWeightVsReturnByDateRange(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

    @Query("SELECT new com.goldproject.goldproject.dto.GhataTrendDTO(" +
            "k.karigarName, " +
            "CAST(EXTRACT(YEAR FROM k.dateIssued) AS int), " +
            "CAST(EXTRACT(MONTH FROM k.dateIssued) AS int), " +
            "SUM(CAST(k.estimatedMetalRequired AS double) - (CAST(k.finishedWeight AS double) + CAST(k.scrapReturned AS double)) - (CAST(k.estimatedMetalRequired AS double) * (CAST(k.expectedWastagePercent AS double) / 100.0)))) " +
            "FROM KarigarJob k " +
            "WHERE k.dateIssued BETWEEN :startDate AND :endDate " +
            "AND (:karigarName IS NULL OR k.karigarName = :karigarName) " +
            "GROUP BY k.karigarName, EXTRACT(YEAR FROM k.dateIssued), EXTRACT(MONTH FROM k.dateIssued) " +
            "ORDER BY EXTRACT(YEAR FROM k.dateIssued) ASC, EXTRACT(MONTH FROM k.dateIssued) ASC")
    List<GhataTrendDTO> getGhataTrend(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("karigarName") String karigarName);

    @Query("SELECT k FROM KarigarJob k " +
            "WHERE k.status = 'Completed' " +
            "AND k.dateIssued IS NOT NULL " +
            "AND k.dateReturned IS NOT NULL " +
            "AND k.dateReturned BETWEEN :startDate AND :endDate")
    List<KarigarJob> findCompletedJobsForTatCalculations(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

    // 1. Lookup query to get distinct active karigars
    @Query("SELECT DISTINCT k.karigarName FROM KarigarJob k WHERE k.karigarName IS NOT NULL ORDER BY k.karigarName")
    List<String> findDistinctKarigarNames();

    // 2. Fetch jobs for specific karigars within a date range
    @Query("SELECT k FROM KarigarJob k " +
            "WHERE k.dateIssued BETWEEN :startDate AND :endDate " +
            "AND k.karigarName IN :karigarNames")
    List<KarigarJob> findJobsByKarigarNamesAndDateRange(
            @Param("karigarNames") List<String> karigarNames,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);


    @Query("SELECT k FROM KarigarJob k " +
            "WHERE k.status = 'Completed' " +
            "AND k.dateReturned BETWEEN :startDate AND :endDate")
    List<KarigarJob> findCompletedJobsByDateRange(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

    @Query("SELECT k FROM KarigarJob k LEFT JOIN FETCH k.billItem b " +
            "WHERE k.status = 'Completed' " +
            "AND k.dateReturned BETWEEN :startDate AND :endDate")
    List<KarigarJob> findCompletedJobsWithBillItemsByDateRange(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

    // New method to find all jobs issued to track Advances given out
    @Query("SELECT k FROM KarigarJob k " +
            "WHERE k.dateIssued BETWEEN :startDate AND :endDate")
    List<KarigarJob> findJobsIssuedByDateRange(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);

}