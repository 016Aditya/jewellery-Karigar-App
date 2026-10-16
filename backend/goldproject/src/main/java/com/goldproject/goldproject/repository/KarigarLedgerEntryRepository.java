package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.KarigarLedgerEntry;
import com.goldproject.goldproject.enums.LedgerAssetClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface KarigarLedgerEntryRepository extends JpaRepository<KarigarLedgerEntry, Long> {

    // All entries across every asset-class account belonging to one karigar, newest first —
    // this is what powers the "click a karigar row to see every transaction" detail view.
    // Scoped to a rolling window (currently last 3 months) rather than full history, since
    // the detail screen is meant for recent activity review, not a full audit export.
    @Query("SELECT e FROM KarigarLedgerEntry e " +
            "JOIN FETCH e.account a " +
            "WHERE a.karigar.id = :karigarId " +
            "AND e.date >= :since " +
            "ORDER BY e.date DESC, e.id DESC")
    List<KarigarLedgerEntry> findByKarigarIdSinceOrderByDateDesc(
            @Param("karigarId") Long karigarId, @Param("since") LocalDate since);

    // Absolute, all-time sum of fine weight for one karigar, grouped by asset class and
    // entry type (ISSUE vs everything else) — unfiltered by any display window, so the
    // Settlement Engine's OUT/IN totals never drift from the true ledger history even
    // though /entries only ever returns the last 3 months for display.
    @Query("SELECT a.assetClass, e.entryType, SUM(e.fineWeight) " +
            "FROM KarigarLedgerEntry e JOIN e.account a " +
            "WHERE a.karigar.id = :karigarId " +
            "GROUP BY a.assetClass, e.entryType")
    List<Object[]> sumFineWeightByAssetClassAndType(@Param("karigarId") Long karigarId);

    // Every entry for one karigar's single asset-class account, unwindowed, oldest first —
    // used only by the Excel export so the running balance for the very first exported row
    // (which may sit years into the ledger's history) is still computed against the full
    // chain of custody, not just whatever a display window happens to include.
    @Query("SELECT e FROM KarigarLedgerEntry e JOIN FETCH e.account a " +
            "WHERE a.karigar.id = :karigarId AND a.assetClass = :assetClass " +
            "ORDER BY e.date ASC, e.id ASC")
    List<KarigarLedgerEntry> findByKarigarIdAndAssetClassOrderByDateAsc(
            @Param("karigarId") Long karigarId, @Param("assetClass") LedgerAssetClass assetClass);
}
