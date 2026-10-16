export const PURITIES = ["24K", "22K", "18K", "14K", "9K"];
export const PURITY_MULTIPLIER = {
  // The shop's "24K" stock is actually 995 fineness (not 999) — this is the true factor
  // used for every calculation (billing, catalogue, karigar ledger), even though the
  // customer-facing label everywhere just reads "24K".
  "24K": 0.995,
  "22K": 0.916,
  "18K": 0.75,
  "14K": 0.583,
  "9K": 0.375,
};

export const calculateItemValue = (item, type, metalRate) => {
  const isCatalogue = item.hasOwnProperty("categoryId");

  const oldWeight = Number(item.oldWeight) || 0;
  const stoneVal = Number(item.stoneValue) || 0;

  // BUG FIX: Properly accept '0' without falling back to 3
  const gstPct =
    item.gstPercent === "" || item.gstPercent === undefined
      ? 3
      : Number(item.gstPercent);

  let baseMetalVal = 0,
    makingCharge = 0,
    totalWeight = 0;

  if (isCatalogue) {
    baseMetalVal = Number(item.metalValue) || 0;
    makingCharge = Number(item.makingAmount) || 0;
    totalWeight = Number(item.weight) || 0;
  } else {
    const newWeight = Number(item.newWeight) || 0;
    totalWeight = newWeight + oldWeight;

    const rate = Number(item.rate) || metalRate;
    const mult = PURITY_MULTIPLIER[item.purity] || 1;
    baseMetalVal = totalWeight * rate * mult;

    // BUG FIX: Properly accept '0' for making percent
    makingCharge =
      item.makingPercent !== "" && item.makingPercent !== undefined
        ? baseMetalVal * (Number(item.makingPercent) / 100)
        : Number(item.makingAmount || 0);
  }

  let taxableValue = 0,
    gstAmount = 0,
    netTotal = 0;

  if (type === "DOMESTIC") {
    taxableValue = baseMetalVal + stoneVal + makingCharge;
    gstAmount =
      isCatalogue && item.gstAmount !== undefined
        ? Number(item.gstAmount)
        : taxableValue * (gstPct / 100);
    netTotal = taxableValue + gstAmount;
  } else if (type === "EXPORT") {
    taxableValue = baseMetalVal + stoneVal + makingCharge;
    gstAmount = 0;
    netTotal = taxableValue;
  } else if (type === "PURCHASE") {
    const wastage = Number(item.wastagePercent) || 0;
    const rate = Number(item.rate) || metalRate;
    const mult = PURITY_MULTIPLIER[item.purity] || 1;
    taxableValue = totalWeight * (1 - wastage / 100) * rate * mult;
    gstAmount = 0;
    netTotal = taxableValue;
  } else if (type === "REPAIR") {
    const labor = Number(item.laborAmount) || 0;
    taxableValue = labor + baseMetalVal;
    gstAmount = labor * 0.18 + baseMetalVal * (gstPct / 100);
    netTotal = taxableValue + gstAmount;
  }

  return {
    baseMetalVal,
    stoneVal,
    taxableValue,
    gstAmount,
    netTotal,
    totalWeight,
  };
};

// --- Multi-State (place-of-supply GST) pricing — used solely by MultiStateBill.jsx -----
// Reference: SLS_MultiState_Bills.pdf. Supplier is always West Bengal (fixed); the buyer's
// state (vs supplier state) decides CGST+SGST / IGST / CGST+UTGST / Zero-Rated(SEZ).
export const SUPPLIER_STATE_CODE = "19";
export const SUPPLIER_STATE_NAME = "West Bengal";
export const SUPPLIER_GSTIN = "19ABCDE1234F1Z5";

export const INDIA_STATES = [
  { code: "01", name: "Jammu & Kashmir", isUT: true },
  { code: "02", name: "Himachal Pradesh", isUT: false },
  { code: "03", name: "Punjab", isUT: false },
  { code: "04", name: "Chandigarh", isUT: true },
  { code: "05", name: "Uttarakhand", isUT: false },
  { code: "06", name: "Haryana", isUT: false },
  { code: "07", name: "Delhi", isUT: true },
  { code: "08", name: "Rajasthan", isUT: false },
  { code: "09", name: "Uttar Pradesh", isUT: false },
  { code: "10", name: "Bihar", isUT: false },
  { code: "11", name: "Sikkim", isUT: false },
  { code: "12", name: "Arunachal Pradesh", isUT: false },
  { code: "13", name: "Nagaland", isUT: false },
  { code: "14", name: "Manipur", isUT: false },
  { code: "15", name: "Mizoram", isUT: false },
  { code: "16", name: "Tripura", isUT: false },
  { code: "17", name: "Meghalaya", isUT: false },
  { code: "18", name: "Assam", isUT: false },
  { code: "19", name: "West Bengal", isUT: false },
  { code: "20", name: "Jharkhand", isUT: false },
  { code: "21", name: "Odisha", isUT: false },
  { code: "22", name: "Chhattisgarh", isUT: false },
  { code: "23", name: "Madhya Pradesh", isUT: false },
  { code: "24", name: "Gujarat", isUT: false },
  { code: "25", name: "Dadra & Nagar Haveli and Daman & Diu", isUT: true },
  { code: "26", name: "Maharashtra", isUT: false },
  { code: "27", name: "Andhra Pradesh", isUT: false },
  { code: "28", name: "Karnataka", isUT: false },
  { code: "29", name: "Goa", isUT: false },
  { code: "30", name: "Lakshadweep", isUT: true },
  { code: "31", name: "Kerala", isUT: false },
  { code: "32", name: "Tamil Nadu", isUT: false },
  { code: "33", name: "Puducherry", isUT: true },
  { code: "34", name: "Andaman & Nicobar Islands", isUT: true },
  { code: "35", name: "Telangana", isUT: false },
  { code: "36", name: "Ladakh", isUT: true },
  { code: "37", name: "Other Territory", isUT: true },
];

// SEZ overrides everything else (zero-rated under LUT); otherwise same state = intra-state,
// UT destination = Union Territory GST, anything else = inter-state IGST.
export const determineSupplyType = (buyerStateCode, isSez) => {
  if (isSez) return "ZERO_RATED";
  if (buyerStateCode === SUPPLIER_STATE_CODE) return "INTRA_STATE";
  const state = INDIA_STATES.find((s) => s.code === buyerStateCode);
  if (state?.isUT) return "UNION_TERRITORY";
  return "INTER_STATE";
};

export const SUPPLY_TYPE_LABELS = {
  INTRA_STATE: "CGST + SGST (Intra-State)",
  INTER_STATE: "IGST Only (Inter-State)",
  UNION_TERRITORY: "CGST + UTGST (Union Territory)",
  ZERO_RATED: "Zero-Rated (SEZ / LUT)",
};

// Mirrors BillService.recalculateMultiStateItem exactly (Metal/Making/Stone each taxed at
// their own user-editable rate, default 3% / 5% / 0.25%, then split by supply type).
export const calculateMultiStateItemValue = (item, ratesMap = {}, supplyType) => {
  const weight = Number(item.weight) || 0;
  const rate = Number(item.rate) || ratesMap.GOLD?.rate || 0;
  const mult = PURITY_MULTIPLIER[item.purity] || 1;
  const metalValue = weight * rate * mult;

  const makingPercent = Number(item.makingPercent) || 0;
  const makingAmount = metalValue * (makingPercent / 100);
  const stoneValue = Number(item.stoneValue) || 0;

  const metalGstPercent =
    item.metalGstPercent !== "" && item.metalGstPercent != null
      ? Number(item.metalGstPercent)
      : 3;
  const makingGstPercent =
    item.makingGstPercent !== "" && item.makingGstPercent != null
      ? Number(item.makingGstPercent)
      : 5;
  const stoneGstPercent =
    item.stoneGstPercent !== "" && item.stoneGstPercent != null
      ? Number(item.stoneGstPercent)
      : 0.25;

  const taxableValue = metalValue + makingAmount + stoneValue;
  const zeroRated = supplyType === "ZERO_RATED";
  const totalTax = zeroRated
    ? 0
    : (metalValue * metalGstPercent +
        makingAmount * makingGstPercent +
        stoneValue * stoneGstPercent) /
      100;

  let cgst = 0,
    sgst = 0,
    igst = 0,
    utgst = 0;
  if (!zeroRated) {
    if (supplyType === "UNION_TERRITORY") {
      cgst = totalTax / 2;
      utgst = totalTax / 2;
    } else if (supplyType === "INTER_STATE") {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }
  }

  const netTotal = taxableValue + totalTax;
  return {
    metalValue,
    makingAmount,
    stoneValue,
    taxableValue,
    totalTax,
    cgst,
    sgst,
    igst,
    utgst,
    netTotal,
    totalWeight: weight,
  };
};

// --- Domestic-only, metal-aware pricing (used solely by DomesticBill.jsx) -------------
// Rose/White/Yellow Gold are gold alloys and are billed off the GOLD rate with the same
// 24K-9K purity factor table; Silver is billed at its own rate directly (no factor);
// Platinum is billed at its own rate x 0.950. Per the client's billing reference guide.
export const SILVER_PURITIES = ["999", "925"];
export const PLATINUM_PURITIES = ["950"];

export const getPuritiesForMetal = (metalType) => {
  if (metalType === "SILVER") return SILVER_PURITIES;
  if (metalType === "PLATINUM") return PLATINUM_PURITIES;
  return PURITIES; // GOLD, ROSE_GOLD, WHITE_GOLD, YELLOW_GOLD all share the gold table
};

const resolveDomesticRate = (metalType, ratesMap = {}) => {
  if (metalType === "SILVER") return ratesMap.SILVER?.rate || 0;
  if (metalType === "PLATINUM") return ratesMap.PLATINUM?.rate || 0;
  return ratesMap.GOLD?.rate || 0; // gold family always prices off the Gold rate
};

const resolveDomesticMultiplier = (metalType, purity) => {
  if (metalType === "SILVER") return 1;
  if (metalType === "PLATINUM") return 0.95;
  return PURITY_MULTIPLIER[purity] || 1;
};

// Mirrors calculateItemValue's DOMESTIC branch, but resolves the rate/multiplier from the
// item's own metalType instead of assuming Gold. calculateItemValue itself is left
// untouched — Export/Purchase/Repair keep using it exactly as before.
export const calculateDomesticItemValue = (item, ratesMap = {}) => {
  const isCatalogue = item.hasOwnProperty("categoryId");

  const oldWeight = Number(item.oldWeight) || 0;
  const stoneVal = Number(item.stoneValue) || 0;

  const gstPct =
    item.gstPercent === "" || item.gstPercent === undefined
      ? 3
      : Number(item.gstPercent);

  let baseMetalVal = 0,
    makingCharge = 0,
    totalWeight = 0;

  if (isCatalogue) {
    baseMetalVal = Number(item.metalValue) || 0;
    makingCharge = Number(item.makingAmount) || 0;
    totalWeight = Number(item.weight) || 0;
  } else {
    const newWeight = Number(item.newWeight) || 0;
    totalWeight = newWeight + oldWeight;

    const rate = Number(item.rate) || resolveDomesticRate(item.metalType, ratesMap);
    const mult = resolveDomesticMultiplier(item.metalType, item.purity);
    baseMetalVal = totalWeight * rate * mult;

    makingCharge =
      item.makingPercent !== "" && item.makingPercent !== undefined
        ? baseMetalVal * (Number(item.makingPercent) / 100)
        : Number(item.makingAmount || 0);
  }

  const taxableValue = baseMetalVal + stoneVal + makingCharge;
  const gstAmount =
    isCatalogue && item.gstAmount !== undefined
      ? Number(item.gstAmount)
      : taxableValue * (gstPct / 100);
  const netTotal = taxableValue + gstAmount;

  return {
    baseMetalVal,
    stoneVal,
    taxableValue,
    gstAmount,
    netTotal,
    totalWeight,
  };
};
