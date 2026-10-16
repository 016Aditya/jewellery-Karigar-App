package com.goldproject.goldproject.service;

// Thrown when a karigar's current fine-metal balance can't cover a requested job
// assignment. Caught by KarigarJobController and returned as a structured 4xx response —
// no job or ledger entry is ever persisted when this is thrown.
public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String message) {
        super(message);
    }
}
