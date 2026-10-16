package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.ItemTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemTrackingRepository extends JpaRepository<ItemTracking, Long> {
    Optional<ItemTracking> findByBillItemId(Long billItemId);

    // Single query, JOIN FETCH-ing BillItem + Bill so mapping to DTO never lazy-loads
    // per row (was previously 1 + 2N queries for N tracking rows). Ordered newest-bill
    // first (createdAt, falling back to the plain date for pre-migration rows), with a
    // stable secondary order by item id so all items of one order stay adjacent —
    // that's what lets the frontend group rows into orders just by first-seen billId.
    @Query("SELECT t FROM ItemTracking t " +
            "JOIN FETCH t.billItem bi " +
            "JOIN FETCH bi.bill b " +
            "ORDER BY b.createdAt DESC NULLS LAST, b.date DESC, bi.id ASC")
    List<ItemTracking> findAllWithBillItemAndBillOrderByNewest();
}
