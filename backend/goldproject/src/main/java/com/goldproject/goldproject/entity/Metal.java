package com.goldproject.goldproject.entity;

import com.goldproject.goldproject.enums.MetalType;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "metals")
@Data
public class Metal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetalType metalType;

    // Bidirectional to Product ONLY
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

}