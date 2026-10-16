package com.goldproject.goldproject.enums;

// ISSUE = material dispatched to the karigar (increases their fine-metal liability/balance).
// RETURN = material (finished pieces, scrap, or unused stock) received back from the karigar
// (decreases their balance). Maps to the OUT / IN terminology in the ledger reference doc.
//
// USED_IN_ORDER = created automatically when a job card is assigned: the requested fine
// weight is drawn from the karigar's existing balance to build that specific order.
// Mathematically identical to RETURN (decreases balance).
//
// SCRAP_RETURNED_FOR_ORDER = created automatically when a job card is settled/received:
// the fine-gold-equivalent of the scrap handed back for that job. Mathematically identical
// to RETURN (decreases balance).
public enum LedgerEntryType {
    ISSUE,
    RETURN,
    USED_IN_ORDER,
    SCRAP_RETURNED_FOR_ORDER
}
