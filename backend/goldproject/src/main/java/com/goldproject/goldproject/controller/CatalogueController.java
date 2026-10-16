package com.goldproject.goldproject.controller;

import com.goldproject.goldproject.dto.CategoryDTO;
import com.goldproject.goldproject.dto.ProductDTO;
import com.goldproject.goldproject.service.CatalogueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalogue")
@CrossOrigin(origins = "*") // Allow React to connect
@RequiredArgsConstructor
public class CatalogueController {

    private final CatalogueService catalogueService;

    // ==========================================
    // CATEGORY APIs
    // ==========================================

    @GetMapping("/categories")
    public ResponseEntity<List<CategoryDTO>> getAllCategories(
            @RequestParam(required = false) String metalType) {
        return ResponseEntity.ok(catalogueService.getAllCategories(metalType));
    }

    @PostMapping("/categories")
    public ResponseEntity<CategoryDTO> createCategory(@RequestBody CategoryDTO categoryDTO) {
        return new ResponseEntity<>(catalogueService.createCategory(categoryDTO), HttpStatus.CREATED);
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @RequestBody CategoryDTO categoryDTO) {
        return ResponseEntity.ok(catalogueService.updateCategory(id, categoryDTO));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        catalogueService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // METAL TYPES
    // ==========================================

    @GetMapping("/metal-types")
    public ResponseEntity<List<String>> getAllMetalTypes() {
        return ResponseEntity.ok(catalogueService.getAllMetalTypes());
    }

    // ==========================================
    // PRODUCT APIs
    // Each returned row is one metal variant of a product design.
    // ==========================================

    @GetMapping("/products")
    public ResponseEntity<List<ProductDTO>> getAllProducts(
            @RequestParam(required = false) String metalType,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long productId) {
        return ResponseEntity.ok(catalogueService.getAllProducts(metalType, categoryId, productId));
    }

    @PostMapping("/products")
    public ResponseEntity<List<ProductDTO>> createProduct(@RequestBody ProductDTO productDTO) {
        return new ResponseEntity<>(catalogueService.createProduct(productDTO), HttpStatus.CREATED);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<List<ProductDTO>> updateProduct(@PathVariable Long id, @RequestBody ProductDTO productDTO) {
        return ResponseEntity.ok(catalogueService.updateProduct(id, productDTO));
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        catalogueService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}