package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.Metal;
import com.goldproject.goldproject.enums.MetalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MetalRepository extends JpaRepository<Metal, Long> {

    // Single indexed query, joins Product + Category eagerly to avoid N+1 selects,
    // with all filters optional (any combination of metalType/categoryId/productId).
    @Query("SELECT m FROM Metal m JOIN FETCH m.product p JOIN FETCH p.category c " +
            "WHERE (:metalType IS NULL OR m.metalType = :metalType) " +
            "AND (:categoryId IS NULL OR c.id = :categoryId) " +
            "AND (:productId IS NULL OR p.id = :productId)")
    List<Metal> findFiltered(
            @Param("metalType") MetalType metalType,
            @Param("categoryId") Long categoryId,
            @Param("productId") Long productId);
}
