package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.ItemTrackingDTO;
import com.goldproject.goldproject.service.TrackingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tracking")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TrackingController {

    private final TrackingService trackingService;

    @GetMapping
    public ResponseEntity<List<ItemTrackingDTO>> getAllTrackings() {
        return ResponseEntity.ok(trackingService.getAllTrackings());
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<ItemTrackingDTO> updateTrackingStatus(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> updates) {

        String status = (String) updates.get("status");
        Integer progress = (Integer) updates.get("progress");

        return ResponseEntity.ok(trackingService.updateTrackingStatus(itemId, status, progress));
    }
}