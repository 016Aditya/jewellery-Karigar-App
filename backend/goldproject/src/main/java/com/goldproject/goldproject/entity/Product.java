package com.goldproject.goldproject.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Data
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    private String img;

    @Column(nullable = false)
    private String purity;

    @Column(nullable = false)
    private Double weight;

    @Column(name = "making_percent", nullable = false)
    private Double makingPercent;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Bidirectional Many-to-One
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Category category;

    // New: Bidirectional One-to-Many to Metal
    // Cascade ALL and orphanRemoval handles full lifecycle of the Metal entities
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Metal> metals = new ArrayList<>();

    // Helper method to keep bidirectional state in sync
    public void addMetal(Metal metal) {
        metals.add(metal);
        metal.setProduct(this);
    }
}