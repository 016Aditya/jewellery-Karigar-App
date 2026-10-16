package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.Category;
import com.goldproject.goldproject.enums.MetalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);

    // Only categories that actually have at least one product available in the given
    // metal — lets billing dropdowns skip categories with nothing to show for that metal.
    @Query("SELECT DISTINCT c FROM Category c JOIN c.products p JOIN p.metals m " +
            "WHERE m.metalType = :metalType")
    List<Category> findByProductsMetalType(@Param("metalType") MetalType metalType);
}