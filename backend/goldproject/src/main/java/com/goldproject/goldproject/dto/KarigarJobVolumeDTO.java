package com.goldproject.goldproject.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KarigarJobVolumeDTO {
    private String karigarName;
    private Long totalAssigned;   // Represents the total jobs given to the karigar in that month
    private Long totalCompleted;  // Jobs returned/completed (Green Bar)
    private Long totalPending;    // Jobs currently active/assigned (Orange Bar)
}