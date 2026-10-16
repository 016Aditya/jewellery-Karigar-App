package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.CategoryDTO;
import com.goldproject.goldproject.dto.ProductDTO;
import com.goldproject.goldproject.entity.Category;
import com.goldproject.goldproject.entity.Metal;
import com.goldproject.goldproject.entity.Product;
import com.goldproject.goldproject.enums.MetalType;
import com.goldproject.goldproject.repository.CategoryRepository;
import com.goldproject.goldproject.repository.MetalRepository;
import com.goldproject.goldproject.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogueService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final MetalRepository metalRepository;
    private final MetalPricingService metalPricingService;

    private static final BigDecimal GST_RATE = new BigDecimal("0.03");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final int CALC_SCALE = 10;

    // ==========================================
    // CATEGORY LOGIC (Unchanged)
    // ==========================================
    public List<CategoryDTO> getAllCategories(String metalTypeFilter) {
        List<Category> categories = metalTypeFilter != null && !metalTypeFilter.isBlank()
                ? categoryRepository.findByProductsMetalType(MetalType.valueOf(metalTypeFilter))
                : categoryRepository.findAll();

        return categories.stream()
                .map(this::mapToCategoryDTO)
                .collect(Collectors.toList());
    }

    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        Category category = new Category();
        category.setName(categoryDTO.getName());
        return mapToCategoryDTO(categoryRepository.save(category));
    }

    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Category not found"));
        category.setName(categoryDTO.getName());
        return mapToCategoryDTO(categoryRepository.save(category));
    }

    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    // ==========================================
    // METAL TYPES
    // ==========================================
    public List<String> getAllMetalTypes() {
        return java.util.Arrays.stream(MetalType.values())
                .map(Enum::name)
                .collect(Collectors.toList());
    }

    // ==========================================
    // PRODUCT LOGIC
    // Catalogue listing is flattened: one row per metal variant of a product.
    // ==========================================

    public List<ProductDTO> getAllProducts(String metalTypeFilter, Long categoryId, Long productId) {
        MetalType metalType = metalTypeFilter != null && !metalTypeFilter.isBlank()
                ? MetalType.valueOf(metalTypeFilter)
                : null;

        // Single JOIN FETCH query (Metal + Product + Category), filters pushed down to the DB
        List<Metal> metals = metalRepository.findFiltered(metalType, categoryId, productId);

        // Look up each distinct metal type's rate once, instead of once per row (avoids N+1 rate queries)
        Map<MetalType, BigDecimal> rateCache = metals.stream()
                .map(Metal::getMetalType)
                .distinct()
                .collect(Collectors.toMap(t -> t, metalPricingService::getLatestRate));

        return metals.stream()
                .map(metal -> mapToProductDTO(metal.getProduct(), metal, rateCache.get(metal.getMetalType())))
                .collect(Collectors.toList());
    }

    public List<ProductDTO> createProduct(ProductDTO productDTO) {
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Product product = mapToProductEntity(productDTO, new Product(), category);

        for (String metalTypeName : productDTO.getMetalTypes()) {
            Metal metal = new Metal();
            metal.setMetalType(MetalType.valueOf(metalTypeName));
            product.addMetal(metal);
        }

        Product savedProduct = productRepository.save(product);

        return savedProduct.getMetals().stream()
                .map(metal -> mapToProductDTO(savedProduct, metal, metalPricingService.getLatestRate(metal.getMetalType())))
                .collect(Collectors.toList());
    }

    public List<ProductDTO> updateProduct(Long id, ProductDTO productDTO) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        Product updatedProduct = mapToProductEntity(productDTO, existingProduct, category);

        List<MetalType> desiredTypes = productDTO.getMetalTypes().stream()
                .map(MetalType::valueOf)
                .collect(Collectors.toList());

        // Remove variants no longer selected (orphanRemoval deletes them on save)
        updatedProduct.getMetals().removeIf(metal -> !desiredTypes.contains(metal.getMetalType()));

        // Add newly selected variants
        List<MetalType> existingTypes = updatedProduct.getMetals().stream()
                .map(Metal::getMetalType)
                .collect(Collectors.toList());
        for (MetalType type : desiredTypes) {
            if (!existingTypes.contains(type)) {
                Metal metal = new Metal();
                metal.setMetalType(type);
                updatedProduct.addMetal(metal);
            }
        }

        Product savedProduct = productRepository.save(updatedProduct);

        return savedProduct.getMetals().stream()
                .map(metal -> mapToProductDTO(savedProduct, metal, metalPricingService.getLatestRate(metal.getMetalType())))
                .collect(Collectors.toList());
    }

    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    // ==========================================
    // MAPPING & CALCULATION UTILITIES
    // ==========================================

    private CategoryDTO mapToCategoryDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        return dto;
    }

    private ProductDTO mapToProductDTO(Product product, Metal metal, BigDecimal currentRate) {
        ProductDTO dto = new ProductDTO();
        dto.setId(metal.getId());
        dto.setProductId(product.getId());
        dto.setName(product.getName());
        dto.setCode(product.getCode());
        dto.setImg(product.getImg());
        dto.setPurity(product.getPurity());
        dto.setWeight(product.getWeight());
        dto.setMakingPercent(product.getMakingPercent());
        dto.setDescription(product.getDescription());
        dto.setMetalType(metal.getMetalType().name());

        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }

        // Perform pricing math using this variant's own metal rate — BigDecimal end-to-end,
        // and the same purity-factor/rate rules BillService uses for the actual bill
        // (via MetalPricingService), so the quoted Catalogue price and the eventual bill
        // line never drift onto two different formulas.
        BigDecimal weight = BigDecimal.valueOf(product.getWeight());
        BigDecimal makingPercent = BigDecimal.valueOf(product.getMakingPercent());
        BigDecimal purityFactor = metalPricingService.getPurityFactor(metal.getMetalType(), product.getPurity());

        BigDecimal metalValue = weight.multiply(currentRate).multiply(purityFactor);
        BigDecimal makingAmount = metalValue.multiply(makingPercent)
                .divide(HUNDRED, CALC_SCALE, RoundingMode.HALF_UP);
        BigDecimal subtotal = metalValue.add(makingAmount);
        BigDecimal gstAmount = subtotal.multiply(GST_RATE);
        BigDecimal mrp = subtotal.add(gstAmount);

        // Round off for currency display
        dto.setMetalValue(metalValue.setScale(0, RoundingMode.HALF_UP).doubleValue());
        dto.setMakingAmount(makingAmount.setScale(0, RoundingMode.HALF_UP).doubleValue());
        dto.setGstAmount(gstAmount.setScale(0, RoundingMode.HALF_UP).doubleValue());
        dto.setMrp(mrp.setScale(0, RoundingMode.HALF_UP).doubleValue());

        return dto;
    }

    private Product mapToProductEntity(ProductDTO dto, Product product, Category category) {
        product.setName(dto.getName());
        product.setCode(dto.getCode());
        product.setImg(dto.getImg());
        product.setPurity(dto.getPurity());
        product.setWeight(dto.getWeight());
        product.setMakingPercent(dto.getMakingPercent());
        product.setDescription(dto.getDescription());
        product.setCategory(category);
        if (product.getMetals() == null) {
            product.setMetals(new ArrayList<>());
        }
        return product;
    }
}
