package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.BillItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BillItemRepository extends JpaRepository<BillItem, Long> {
    Optional<BillItem> findByBillIdAndCode(String billId, String code);

    // Total quantity sold per metal type + product name over the window — used to pick
    // the top 5 sellers per metal (small result set, aggregated in the DB, not the app).
    @Query(value = "SELECT bi.metal_type AS metalType, bi.name AS name, SUM(bi.quantity) AS qty " +
            "FROM bill_items bi JOIN bills b ON bi.bill_id = b.id " +
            "WHERE b.date >= :start AND bi.metal_type IN ('GOLD', 'SILVER', 'PLATINUM') " +
            "GROUP BY bi.metal_type, bi.name",
            nativeQuery = true)
    List<MetalItemTotalProjection> sumQuantityByMetalAndName(@Param("start") LocalDate start);

    // Monthly quantity per metal type + product name over the window — filtered down to
    // the top-5-per-metal set in the service layer before charting.
    @Query(value = "SELECT to_char(b.date, 'YYYY-MM') AS month, bi.metal_type AS metalType, " +
            "bi.name AS name, SUM(bi.quantity) AS qty " +
            "FROM bill_items bi JOIN bills b ON bi.bill_id = b.id " +
            "WHERE b.date >= :start AND bi.metal_type IN ('GOLD', 'SILVER', 'PLATINUM') " +
            "GROUP BY month, bi.metal_type, bi.name",
            nativeQuery = true)
    List<MonthlyMetalItemProjection> sumQuantityByMonthMetalAndName(@Param("start") LocalDate start);

    interface MetalItemTotalProjection {
        String getMetalType();
        String getName();
        Long getQty();
    }

    interface MonthlyMetalItemProjection {
        String getMonth();
        String getMetalType();
        String getName();
        Long getQty();
    }
}