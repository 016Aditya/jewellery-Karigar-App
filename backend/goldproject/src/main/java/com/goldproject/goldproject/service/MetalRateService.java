package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.MetalRateResponseDTO;
import com.goldproject.goldproject.entity.MetalRate;
import com.goldproject.goldproject.enums.MetalType;
import com.goldproject.goldproject.repository.MetalRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MetalRateService {

    private final MetalRateRepository metalRateRepository;

    // Appends a new rate entry for a single, specific metal type
    public void addRate(MetalType metalType, Double rate) {
        MetalRate newRate = new MetalRate();
        newRate.setMetalType(metalType);
        newRate.setRate(rate);
        metalRateRepository.save(newRate);
    }

    // Returns the current rate + % change for every metal type, so the frontend can load all 5 in one call
    public List<MetalRateResponseDTO> getCurrentRates() {
        return Arrays.stream(MetalType.values())
                .map(this::getCurrentRate)
                .collect(Collectors.toList());
    }

    // Returns the current rate + % change for a single, specific metal type
    public MetalRateResponseDTO getCurrentRate(MetalType metalType) {
        List<MetalRate> recentRates = metalRateRepository.findTop2ByMetalTypeOrderByCreatedAtDesc(metalType);

        if (recentRates.isEmpty()) {
            return new MetalRateResponseDTO(metalType.name(), 0.0, 0.0);
        }

        Double currentRate = recentRates.get(0).getRate();

        if (recentRates.size() == 1) {
            return new MetalRateResponseDTO(metalType.name(), currentRate, 0.0);
        }

        Double previousRate = recentRates.get(1).getRate();

        Double percentageChange = 0.0;
        if (previousRate != 0) {
            percentageChange = ((currentRate - previousRate) / previousRate) * 100.0;
        }

        return new MetalRateResponseDTO(metalType.name(), currentRate, percentageChange);
    }
}
