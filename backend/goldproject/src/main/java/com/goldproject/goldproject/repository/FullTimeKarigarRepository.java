package com.goldproject.goldproject.repository;

import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.enums.KarigarType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FullTimeKarigarRepository extends JpaRepository<FullTimeKarigar, Long> {
    List<FullTimeKarigar> findByIsActiveTrue();

    long countByKarigarTypeAndIsActiveTrue(KarigarType karigarType);
}