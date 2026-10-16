package com.goldproject.goldproject.service;

import com.goldproject.goldproject.dto.ItemTrackingDTO;
import com.goldproject.goldproject.entity.BillItem;
import com.goldproject.goldproject.entity.ItemTracking;
import com.goldproject.goldproject.repository.ItemTrackingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TrackingService {

    private final ItemTrackingRepository trackingRepository;

    public List<ItemTrackingDTO> getAllTrackings() {
        return trackingRepository.findAllWithBillItemAndBillOrderByNewest().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public ItemTrackingDTO updateTrackingStatus(Long itemId, String status, Integer progress) {
        ItemTracking tracking = trackingRepository.findByBillItemId(itemId)
                .orElseThrow(() -> new RuntimeException("Tracking not found for item: " + itemId));

        tracking.setCurrentStage(status);
        tracking.setProgress(progress);

        ItemTracking updated = trackingRepository.save(tracking);
        return mapToDTO(updated);
    }

    private ItemTrackingDTO mapToDTO(ItemTracking tracking) {
        ItemTrackingDTO dto = new ItemTrackingDTO();
        BillItem item = tracking.getBillItem();

        dto.setItemId(item.getId());
        dto.setBillId(item.getBill().getId());
        dto.setCustomer(item.getBill().getCustomer());
        dto.setItemName(item.getName() + " (" + item.getPurity() + ")");
        dto.setAmount(item.getMrp() != null ? item.getMrp().doubleValue() : 0.0);

        dto.setStatus(tracking.getCurrentStage());
        dto.setProgress(tracking.getProgress());
        dto.setAssigned(tracking.getAssignedTo());
        dto.setEta(tracking.getEta() != null ? tracking.getEta().toString() : "TBD");

        return dto;
    }
}