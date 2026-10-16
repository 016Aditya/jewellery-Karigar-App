package com.goldproject.goldproject.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Trivial, no-DB-hit endpoint the frontend polls to show a live "backend online/offline"
// indicator in the sidebar — deliberately does nothing else so it stays fast even if
// the DB connection is slow/down.
@CrossOrigin(origins = "*")
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
