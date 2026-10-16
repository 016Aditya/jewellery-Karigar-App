package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.MetalRate;
import com.goldproject.goldproject.enums.MetalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MetalRateRepository extends JpaRepository<MetalRate, Long> {
    // Fetches the latest 2 records for a given metal, ordered by creation time, descending
    List<MetalRate> findTop2ByMetalTypeOrderByCreatedAtDesc(MetalType metalType);
    // Quickly fetch the absolute latest rate for a given metal for catalogue calculations
    Optional<MetalRate> findTopByMetalTypeOrderByCreatedAtDesc(MetalType metalType);
}
