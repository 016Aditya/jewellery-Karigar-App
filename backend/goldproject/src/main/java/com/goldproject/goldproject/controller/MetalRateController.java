package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.MetalRateRequestDTO;
import com.goldproject.goldproject.dto.MetalRateResponseDTO;
import com.goldproject.goldproject.enums.MetalType;
import com.goldproject.goldproject.service.MetalRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metal-rate")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MetalRateController {

    private final MetalRateService metalRateService;

    // Returns the current rate + % change for every metal type in one call (bulk load on app start)
    @GetMapping("/current")
    public ResponseEntity<List<MetalRateResponseDTO>> getCurrentRates() {
        return ResponseEntity.ok(metalRateService.getCurrentRates());
    }

    // Per-metal live rate — a dedicated, addressable endpoint for a single metal type
    @GetMapping("/{metalType}/current")
    public ResponseEntity<MetalRateResponseDTO> getCurrentRate(@PathVariable String metalType) {
        return ResponseEntity.ok(metalRateService.getCurrentRate(MetalType.valueOf(metalType.toUpperCase())));
    }

    // Per-metal rate edit — appends a new rate entry for a single, specific metal type
    @PostMapping("/{metalType}")
    public ResponseEntity<Void> addRate(@PathVariable String metalType, @RequestBody MetalRateRequestDTO request) {
        metalRateService.addRate(MetalType.valueOf(metalType.toUpperCase()), request.getRate());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
