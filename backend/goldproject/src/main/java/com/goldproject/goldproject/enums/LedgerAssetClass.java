package com.goldproject.goldproject.enums;

// The Karigar Gold Ledger treats every purity as belonging to exactly one of these three
// asset classes. Balances are never allowed to mix across classes — a Gold liability can
// only ever be settled with Gold (in any karat/alloy), never Silver or Platinum.
public enum LedgerAssetClass {
    GOLD,
    SILVER,
    PLATINUM
}
