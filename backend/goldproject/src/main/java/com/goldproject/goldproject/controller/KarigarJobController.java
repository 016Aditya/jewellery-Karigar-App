package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.KarigarJobDTO;
import com.goldproject.goldproject.service.DuplicateAssignmentException;
import com.goldproject.goldproject.service.InsufficientBalanceException;
import com.goldproject.goldproject.service.KarigarJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/karigar")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class KarigarJobController {

    private final KarigarJobService karigarJobService;

    @GetMapping
    public ResponseEntity<List<KarigarJobDTO>> getAllJobs() {
        return ResponseEntity.ok(karigarJobService.getAllJobs());
    }

    @PostMapping
    public ResponseEntity<?> assignJob(@RequestBody KarigarJobDTO dto) {
        try {
            return new ResponseEntity<>(karigarJobService.assignJob(dto), HttpStatus.CREATED);
        } catch (InsufficientBalanceException | DuplicateAssignmentException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/receive")
    public ResponseEntity<?> receiveJob(
            @PathVariable Long id,
            @RequestBody KarigarJobDTO dto) {
        try {
            return ResponseEntity.ok(karigarJobService.receiveJob(id, dto));
        } catch (InsufficientBalanceException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", ex.getMessage()));
        }
    }
}