package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.KarigarAccount;
import com.goldproject.goldproject.enums.LedgerAssetClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface KarigarAccountRepository extends JpaRepository<KarigarAccount, Long> {
    Optional<KarigarAccount> findByKarigarIdAndAssetClass(Long karigarId, LedgerAssetClass assetClass);

    List<KarigarAccount> findByKarigarId(Long karigarId);

    // Single query, JOIN FETCH-ing the karigar so the summary list never lazy-loads per row.
    @Query("SELECT a FROM KarigarAccount a JOIN FETCH a.karigar")
    List<KarigarAccount> findAllWithKarigar();
}
