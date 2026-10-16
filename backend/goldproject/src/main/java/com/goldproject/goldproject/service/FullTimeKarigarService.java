package com.goldproject.goldproject.service;

import com.goldproject.goldproject.entity.FullTimeKarigar;
import com.goldproject.goldproject.repository.FullTimeKarigarRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FullTimeKarigarService {

    @Autowired
    private FullTimeKarigarRepository repository;

    // Create
    public FullTimeKarigar createKarigar(FullTimeKarigar karigar) {
        return repository.save(karigar);
    }

    // Read All
    public List<FullTimeKarigar> getAllKarigars() {
        return repository.findAll();
    }

    // Read One
    public Optional<FullTimeKarigar> getKarigarById(Long id) {
        return repository.findById(id);
    }

    // Update
    public FullTimeKarigar updateKarigar(Long id, FullTimeKarigar updatedKarigar) {
        return repository.findById(id).map(existingKarigar -> {
            existingKarigar.setName(updatedKarigar.getName());
            existingKarigar.setContactNumber(updatedKarigar.getContactNumber());
            existingKarigar.setAddress(updatedKarigar.getAddress());
            existingKarigar.setKarigarType(updatedKarigar.getKarigarType());
            existingKarigar.setMonthlySalary(updatedKarigar.getMonthlySalary()!=null? updatedKarigar.getMonthlySalary() : 0.0);
            existingKarigar.setJoiningDate(updatedKarigar.getJoiningDate());
            existingKarigar.setIsActive(updatedKarigar.getIsActive());
            return repository.save(existingKarigar);
        }).orElseThrow(() -> new RuntimeException("Karigar not found with id: " + id));
    }

    // Delete
    public void deleteKarigar(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Karigar not found with id: " + id);
        }
        repository.deleteById(id);
    }
}