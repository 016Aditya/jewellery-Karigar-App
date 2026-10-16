package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.service.FullTimeKarigarService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*") // Allow React to connect
@RestController
@RequestMapping("/api/full-time-karigars")
public class FullTimeKarigarController {

    @Autowired
    private FullTimeKarigarService service;

    // POST /api/full-time-karigars
    @PostMapping
    public ResponseEntity<FullTimeKarigar> createKarigar(@RequestBody FullTimeKarigar karigar) {
        FullTimeKarigar created = service.createKarigar(karigar);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // GET /api/full-time-karigars
    @GetMapping
    public ResponseEntity<List<FullTimeKarigar>> getAllKarigars() {
        return ResponseEntity.ok(service.getAllKarigars());
    }

    // GET /api/full-time-karigars/{id}
    @GetMapping("/{id}")
    public ResponseEntity<FullTimeKarigar> getKarigarById(@PathVariable Long id) {
        return service.getKarigarById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/full-time-karigars/{id}
    @PutMapping("/{id}")
    public ResponseEntity<FullTimeKarigar> updateKarigar(@PathVariable Long id, @RequestBody FullTimeKarigar karigar) {
        try {
            FullTimeKarigar updated = service.updateKarigar(id, karigar);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // DELETE /api/full-time-karigars/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKarigar(@PathVariable Long id) {
        try {
            service.deleteKarigar(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}