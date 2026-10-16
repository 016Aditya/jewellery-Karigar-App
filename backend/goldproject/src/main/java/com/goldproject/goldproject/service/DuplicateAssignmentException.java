package com.goldproject.goldproject.service;

// Thrown when a bill item that already has a job card is submitted for assignment again —
// caught by KarigarJobController and returned as a structured 4xx response so the UI can
// show which existing job already owns this item, instead of a raw DB constraint error.
public class DuplicateAssignmentException extends RuntimeException {
    public DuplicateAssignmentException(String message) {
        super(message);
    }
}
