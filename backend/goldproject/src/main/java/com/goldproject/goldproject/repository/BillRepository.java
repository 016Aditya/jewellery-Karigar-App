package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, String> {
    // Newest bills first for the dashboard/list view. `date` alone is a calendar day and
    // ties for every bill created the same day — createdAt (a real timestamp) is the
    // required tiebreaker, otherwise same-day bills fall back to undefined DB order.
    List<Bill> findAllByOrderByDateDescCreatedAtDesc();
    // Fetches specific category of bills, same ordering.
    List<Bill> findAllByOrderTypeOrderByDateDescCreatedAtDesc(String orderType);

    // An order (bill) is "completed" once every one of its items has reached the
    // Ready/Dispatched stage. Counts only, no row hydration — cheap for a dashboard tile.
    @Query("SELECT COUNT(b) FROM Bill b WHERE b.date BETWEEN :start AND :end " +
            "AND EXISTS (SELECT 1 FROM ItemTracking t WHERE t.billItem.bill = b) " +
            "AND NOT EXISTS (SELECT 1 FROM ItemTracking t WHERE t.billItem.bill = b " +
            "AND t.currentStage NOT IN ('Ready', 'Dispatched'))")
    long countCompletedOrdersBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // An order is still "in progress" if at least one of its items hasn't reached
    // Ready/Dispatched yet.
    @Query("SELECT COUNT(b) FROM Bill b WHERE b.date BETWEEN :start AND :end " +
            "AND EXISTS (SELECT 1 FROM ItemTracking t WHERE t.billItem.bill = b " +
            "AND t.currentStage NOT IN ('Ready', 'Dispatched'))")
    long countInProgressOrdersBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);
}