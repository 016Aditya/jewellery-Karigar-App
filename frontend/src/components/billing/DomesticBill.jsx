import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  Divider,
  Select,
  MenuItem,
  IconButton,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  Fade,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  ErrorOutline as ErrorIcon,
  TaskAlt as TaskAltIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";
import QuantityStepper from "../QuantityStepper";
import {
  calculateDomesticItemValue,
  getPuritiesForMetal,
} from "../../utils/billingMath";

const BILLS_API_BASE = "http://localhost:8090/api/bills";
const DEFAULT_METAL_TYPES = [
  "GOLD",
  "SILVER",
  "PLATINUM",
  "WHITE_GOLD",
  "ROSE_GOLD",
  "YELLOW_GOLD",
];
const formatMetal = (m) => (m || "").replace("_", " ");
const resolveRate = (metalType, ratesMap = {}) => {
  if (metalType === "SILVER") return ratesMap.SILVER?.rate || 0;
  if (metalType === "PLATINUM") return ratesMap.PLATINUM?.rate || 0;
  return ratesMap.GOLD?.rate || 0;
};

// Width of the fixed sidebar drawer elsewhere in the app — used so the fixed bottom
// bar lines up with the content column instead of running full bleed under the sidebar.
const SIDEBAR_WIDTH = 220;
// Height reserved for the fixed bottom summary bar so scrolling content never sits behind it.
const SUMMARY_BAR_HEIGHT = 88;

// Reusable style tokens so every TextField / Select shares the same clean,
// enterprise look instead of default MUI chrome.
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    bgcolor: "background.paper",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.main" },
    "&.Mui-focused fieldset": { borderWidth: 1.5 },
  },
};

// Steps shown inside the "vibe coding" submission modal.
const SUBMIT_STEPS = [
  { key: "verifying-prices", label: "Verifying live metal prices" },
  { key: "matching-items", label: "Matching bill items to catalogue" },
  {
    key: "verifying-calculations",
    label: "Verifying totals & GST calculations",
  },
  { key: "finalising", label: "Finalising bill" },
];

// Two catalogue items are "the same line" if they point at the same product. Custom
// (non-catalogue) items are "the same line" if every manually entered attribute matches —
// otherwise a different weight/making/etc genuinely is a distinct line, not a duplicate.
const isSameCatalogueItem = (a, b) =>
  Boolean(a.productId) &&
  a.productId === b.productId &&
  a.metalType === b.metalType;

const isSameCustomItem = (a, b) =>
  !a.productId &&
  !b.productId &&
  a.name === b.name &&
  a.metalType === b.metalType &&
  a.purity === b.purity &&
  Number(a.newWeight) === Number(b.newWeight) &&
  Number(a.oldWeight) === Number(b.oldWeight) &&
  Number(a.oldPrice) === Number(b.oldPrice) &&
  Number(a.makingPercent) === Number(b.makingPercent) &&
  Number(a.stoneValue) === Number(b.stoneValue) &&
  Number(a.gstPercent) === Number(b.gstPercent);

export default function DomesticBill({
  rates = {},
  metalTypeOptions = DEFAULT_METAL_TYPES,
  getCategoriesForMetal,
  getProductsForMetalCategory,
  onSaveSuccess,
  notify,
}) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ customer: "", phone: "", items: [] });
  const [selectedMetal, setSelectedMetal] = useState(
    metalTypeOptions[0] || "GOLD",
  );
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [entryItem, setEntryItem] = useState({
    name: "",
    purity: getPuritiesForMetal("GOLD")[1] || "22K",
    newWeight: "",
    oldWeight: "",
    oldPrice: "",
    rate: resolveRate("GOLD", rates),
    makingPercent: "",
    stoneValue: "",
    gstPercent: 3,
  });

  // --- Submission modal state: drives the step-by-step "vibe coding" progress UI ---
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("running"); // running | success | error
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const handleMetalChange = (metal) => {
    setSelectedMetal(metal);
    setSelectedCatId("");
    setSelectedProductId("");
    const purities = getPuritiesForMetal(metal);
    setEntryItem((f) => ({
      ...f,
      purity: purities[Math.min(1, purities.length - 1)] || purities[0],
      rate: resolveRate(metal, rates),
    }));
  };

  // Categories re-fetch (through the parent's cache) whenever the selected metal changes —
  // most of the time this is an instant cache hit, only hitting the DB the first time a
  // given metal is browsed during this visit to the Generate Bill screen.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingCategories(true);
    getCategoriesForMetal(selectedMetal)
      .then((cats) => !cancelled && setCategories(cats))
      .finally(() => !cancelled && setIsLoadingCategories(false));
    return () => {
      cancelled = true;
    };
  }, [selectedMetal, getCategoriesForMetal]);

  // Products are only fetched once both metal AND category are chosen, and only the
  // matching slice (never the whole catalogue) — same caching behavior as categories.
  useEffect(() => {
    if (!selectedCatId) {
      setFilteredProducts([]);
      return;
    }
    let cancelled = false;
    setIsLoadingProducts(true);
    getProductsForMetalCategory(selectedMetal, selectedCatId)
      .then((prods) => !cancelled && setFilteredProducts(prods))
      .finally(() => !cancelled && setIsLoadingProducts(false));
    return () => {
      cancelled = true;
    };
  }, [selectedMetal, selectedCatId, getProductsForMetalCategory]);

  const summary = useMemo(() => {
    let subtotal = 0,
      totalGst = 0,
      grandTotal = 0;
    form.items.forEach((item) => {
      const vals = calculateDomesticItemValue(item, rates);
      const qty = item.quantity || 1;
      subtotal += vals.taxableValue * qty;
      totalGst += vals.gstAmount * qty;
      grandTotal += vals.netTotal * qty;
    });
    return { subtotal, gst: totalGst, total: grandTotal };
  }, [form.items, rates]);

  // Adding an item that already exists on the bill (same catalogue product, or an
  // identical custom entry) bumps its quantity instead of inserting a new row — this
  // is what keeps one DB row per line item instead of duplicating rows for repeat items.
  const addOrIncrementItem = (newItem, matcher) => {
    setForm((prev) => {
      const existingIdx = prev.items.findIndex((it) => matcher(it, newItem));
      if (existingIdx !== -1) {
        const items = [...prev.items];
        items[existingIdx] = {
          ...items[existingIdx],
          quantity: (items[existingIdx].quantity || 1) + 1,
        };
        return { ...prev, items };
      }
      return { ...prev, items: [...prev.items, { ...newItem, quantity: 1 }] };
    });
  };

  const handleAddCatalogueItem = () => {
    const p = filteredProducts.find((x) => x.id === selectedProductId);
    if (!p) return;
    addOrIncrementItem({ ...p, metalType: selectedMetal }, isSameCatalogueItem);
    setSelectedCatId("");
    setSelectedProductId("");
  };

  const handleAddCustomItem = () => {
    if (!entryItem.name || !entryItem.newWeight) {
      notify("Fill Item Desc and New Weight", "warning");
      return;
    }
    addOrIncrementItem(
      { ...entryItem, id: Date.now(), metalType: selectedMetal },
      isSameCustomItem,
    );
    const purities = getPuritiesForMetal(selectedMetal);
    setEntryItem({
      name: "",
      purity: purities[Math.min(1, purities.length - 1)] || purities[0],
      newWeight: "",
      oldWeight: "",
      oldPrice: "",
      rate: resolveRate(selectedMetal, rates),
      makingPercent: "",
      stoneValue: "",
      gstPercent: 3,
    });
  };

  // Quantity +/- for an existing line — floors at 1 (use the delete action to remove a line).
  const handleQuantityChange = (idx, delta) => {
    setForm((prev) => {
      const items = [...prev.items];
      const current = items[idx].quantity || 1;
      const next = Math.max(1, current + delta);
      items[idx] = { ...items[idx], quantity: next };
      return { ...prev, items };
    });
  };

  // Builds the payload exactly as before — pure extraction, no behavior change.
  const buildPayload = () => ({
    id: `INV-${Date.now().toString().slice(-5)}`,
    type: "Sale",
    orderType: "DOMESTIC",
    date: new Date().toISOString().split("T")[0],
    customer: form.customer.trim(),
    phone: form.phone.trim(),
    total: Math.round(summary.total),
    gst: Math.round(summary.gst),
    status: "Completed",
    items: form.items.map((item) => {
      const vals = calculateDomesticItemValue(item, rates);
      return {
        name: item.name,
        purity: item.purity,
        metalType: item.metalType,
        productId: item.productId || null,
        weight: vals.totalWeight,
        oldWeight: Number(item.oldWeight || 0),
        oldPrice: Number(item.oldPrice || 0),
        gstPercent: Number(item.gstPercent || 3),
        quantity: item.quantity || 1,
        rate: Number(item.rate || resolveRate(item.metalType, rates)),
        stoneValue: Number(item.stoneValue || 0),
        makingPercent: Number(item.makingPercent || 0),
        mrp: vals.netTotal,
      };
    }),
  });

  // Drives the step-by-step modal. Each step advances on a short timer purely for the
  // "verification" visual; the real network call happens once we reach "finalising".
  const runSubmitSequence = () => {
    clearTimers();
    setSubmitStatus("running");
    setActiveStepIndex(0);
    setSubmitOpen(true);
    setIsSaving(true);

    const STEP_DELAY = 650;

    // Step 0 -> 1 -> 2 shown purely as progress; step 3 ("finalising") triggers the real save.
    const t1 = setTimeout(() => setActiveStepIndex(1), STEP_DELAY);
    const t2 = setTimeout(() => setActiveStepIndex(2), STEP_DELAY * 2);
    const t3 = setTimeout(async () => {
      setActiveStepIndex(3);
      try {
        const payload = buildPayload();
        const res = await fetch(BILLS_API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to save");
        setSubmitStatus("success");
      } catch (err) {
        setSubmitStatus("error");
      } finally {
        setIsSaving(false);
      }
    }, STEP_DELAY * 3);

    timersRef.current = [t1, t2, t3];
  };

  const handleSave = () => {
    runSubmitSequence();
  };

  const handleModalOk = () => {
    setSubmitOpen(false);
    if (typeof onSaveSuccess === "function") onSaveSuccess();
    navigate("/billing");
  };

  const handleRetry = () => {
    runSubmitSequence();
  };

  const handleCloseOnError = () => {
    clearTimers();
    setSubmitOpen(false);
    setIsSaving(false);
  };

  const canSubmit = form.items.length > 0 && !!form.customer && !isSaving;

  return (
    <>
      {/* Bottom padding reserves space so content never sits behind the fixed summary bar */}
      <Box sx={{ pb: `${SUMMARY_BAR_HEIGHT + 24}px` }}>
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight={700}
                mb={2}
                letterSpacing={0.5}
              >
                2. CUSTOMER DETAILS
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Name / Entity"
                    value={form.customer}
                    onChange={(e) =>
                      setForm({ ...form, customer: e.target.value })
                    }
                    sx={fieldSx}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Contact / GSTIN"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    sx={fieldSx}
                  />
                </Grid>
              </Grid>
            </Card>

            <Card
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "none",
              }}
            >
              <Typography
                variant="subtitle2"
                color="primary"
                fontWeight={700}
                mb={2}
                letterSpacing={0.5}
              >
                3. TRANSACTION ITEMS
              </Typography>
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: "background.default",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  mb: 3,
                }}
              >
                <FormControl size="small" fullWidth sx={{ mb: 2, ...fieldSx }}>
                  <InputLabel>Metal Type</InputLabel>
                  <Select
                    value={selectedMetal}
                    onChange={(e) => handleMetalChange(e.target.value)}
                    label="Metal Type"
                    sx={{ borderRadius: 1.5 }}
                  >
                    {metalTypeOptions.map((m) => (
                      <MenuItem key={m} value={m}>
                        {formatMetal(m)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box display="flex" gap={2} mb={2}>
                  <FormControl
                    size="small"
                    sx={{ flex: 1, ...fieldSx }}
                    disabled={isLoadingCategories}
                  >
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCatId}
                      onChange={(e) => {
                        setSelectedCatId(e.target.value);
                        setSelectedProductId("");
                      }}
                      label="Category"
                      sx={{ borderRadius: 1.5 }}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl
                    size="small"
                    sx={{ flex: 1, ...fieldSx }}
                    disabled={!selectedCatId || isLoadingProducts}
                  >
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      label="Product"
                      sx={{ borderRadius: 1.5 }}
                    >
                      {filteredProducts.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    disabled={!selectedProductId}
                    onClick={handleAddCatalogueItem}
                    sx={{ borderRadius: 1.5, px: 3 }}
                  >
                    Add
                  </Button>
                </Box>
                <Divider sx={{ my: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    OR CUSTOM ENTRY
                  </Typography>
                </Divider>
                <Grid container spacing={2} alignItems="center" mb={2}>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Item Desc"
                      value={entryItem.name}
                      onChange={(e) =>
                        setEntryItem({ ...entryItem, name: e.target.value })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="New Wt (g)"
                      type="number"
                      value={entryItem.newWeight}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          newWeight: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <FormControl fullWidth size="small" sx={fieldSx}>
                      <InputLabel>Purity</InputLabel>
                      <Select
                        value={entryItem.purity}
                        onChange={(e) =>
                          setEntryItem({
                            ...entryItem,
                            purity: e.target.value,
                          })
                        }
                        label="Purity"
                        sx={{ borderRadius: 1.5 }}
                      >
                        {getPuritiesForMetal(selectedMetal).map((p) => (
                          <MenuItem key={p} value={p}>
                            {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Old Wt (g)"
                      type="number"
                      value={entryItem.oldWeight}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          oldWeight: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Old Price (₹/g)"
                      type="number"
                      value={entryItem.oldPrice}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          oldPrice: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Making (%)"
                      type="number"
                      value={entryItem.makingPercent}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          makingPercent: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Stones (₹)"
                      type="number"
                      value={entryItem.stoneValue}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          stoneValue: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="GST (%)"
                      type="number"
                      value={entryItem.gstPercent}
                      onChange={(e) =>
                        setEntryItem({
                          ...entryItem,
                          gstPercent: e.target.value,
                        })
                      }
                      sx={fieldSx}
                    />
                  </Grid>
                  <Grid item xs={12} mt={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={handleAddCustomItem}
                      disabled={!entryItem.name || !entryItem.newWeight}
                      sx={{ borderRadius: 1.5, py: 1 }}
                    >
                      Add Custom Item
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  boxShadow: "none",
                  borderRadius: 2,
                  borderColor: "divider",
                  overflow: "hidden",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        "& th": {
                          bgcolor: "background.default",
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          color: "text.secondary",
                          textTransform: "uppercase",
                          borderBottom: "2px solid",
                          borderColor: "divider",
                          py: 1.25,
                        },
                      }}
                    >
                      <TableCell>Item</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Total Wt</TableCell>
                      <TableCell align="right">Taxable</TableCell>
                      <TableCell align="right">GST</TableCell>
                      <TableCell align="right">Net</TableCell>
                      <TableCell align="center">Act</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {form.items.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          align="center"
                          sx={{ py: 4, border: 0 }}
                        >
                          <Typography variant="body2" color="text.disabled">
                            No items added yet — use the catalogue or custom
                            entry above.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {form.items.map((item, idx) => {
                      const vals = calculateDomesticItemValue(item, rates);
                      const qty = item.quantity || 1;
                      return (
                        <TableRow
                          key={idx}
                          sx={{
                            transition: "background-color 0.15s ease",
                            "&:hover": { bgcolor: "action.hover" },
                            "&:last-child td": { borderBottom: 0 },
                            "& td": { borderColor: "divider", py: 1.4 },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatMetal(item.metalType)} · {item.purity}
                            </Typography>
                          </TableCell>

                          {/* Quantity stepper — adjusts the same row's quantity field
                              instead of ever creating a duplicate line/DB row. */}
                          <TableCell align="center">
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              gap={0.5}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(idx, -1)}
                                disabled={qty <= 1}
                                sx={{
                                  width: 26,
                                  height: 26,
                                  border: "1px solid",
                                  borderColor: "divider",
                                  "&:hover": {
                                    bgcolor: "action.selected",
                                    borderColor: "primary.main",
                                  },
                                }}
                              >
                                <RemoveIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{ minWidth: 22, textAlign: "center" }}
                              >
                                {qty}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(idx, 1)}
                                sx={{
                                  width: 26,
                                  height: 26,
                                  border: "1px solid",
                                  borderColor: "divider",
                                  "&:hover": {
                                    bgcolor: "action.selected",
                                    borderColor: "primary.main",
                                  },
                                }}
                              >
                                <AddIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          </TableCell>

                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {(vals.totalWeight * qty)
                                .toFixed(3)
                                .replace(/\.?0+$/, "")}
                              g
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ₹
                              {Math.round(
                                vals.taxableValue * qty,
                              ).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              ₹
                              {Math.round(
                                vals.gstAmount * qty,
                              ).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              ₹
                              {Math.round(vals.netTotal * qty).toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  items: p.items.filter((_, i) => i !== idx),
                                }))
                              }
                              sx={{
                                "&:hover": {
                                  bgcolor: "error.main",
                                  color: "#fff",
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Fixed bottom summary bar — always in the same horizontal position, never shifts
          with page content or item count. Sits above everything via zIndex, aligned to
          the content column (offset by the sidebar width on desktop). */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: { xs: 0, md: SIDEBAR_WIDTH },
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          boxShadow: "0 -8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            py: 1.75,
            display: "flex",
            alignItems: "center",
            gap: { xs: 2, md: 4 },
            maxWidth: 1400,
            mx: "auto",
            flexWrap: "wrap",
          }}
        >
          <Box display="flex" alignItems="baseline" gap={1} minWidth={140}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              letterSpacing={0.5}
            >
              TAXABLE
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              ₹{Math.round(summary.subtotal).toLocaleString()}
            </Typography>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", sm: "block" } }}
          />

          <Box display="flex" alignItems="baseline" gap={1} minWidth={120}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              letterSpacing={0.5}
            >
              GST
            </Typography>
            <Typography variant="body2" fontWeight={700}>
              ₹{Math.round(summary.gst).toLocaleString()}
            </Typography>
          </Box>

          <Divider
            orientation="vertical"
            flexItem
            sx={{ display: { xs: "none", sm: "block" } }}
          />

          <Box
            display="flex"
            alignItems="center"
            gap={1.25}
            px={2}
            py={0.75}
            borderRadius={1.5}
            bgcolor="goldAccent.lightBg"
            border="1px dashed"
            borderColor="goldAccent.main"
          >
            <Typography
              variant="caption"
              fontWeight={800}
              color="goldAccent.text"
              letterSpacing={0.5}
            >
              GRAND TOTAL
            </Typography>
            <Typography variant="h6" fontWeight={800} color="goldAccent.text">
              ₹{Math.round(summary.total).toLocaleString()}
            </Typography>
          </Box>

          {summary.total >= 200000 && (
            <Alert
              icon={<WarningIcon fontSize="small" />}
              severity="warning"
              sx={{ borderRadius: 1.5, py: 0, flexGrow: { xs: 1, md: 0 } }}
            >
              <strong>Sec 269ST:</strong> PAN Mandatory.
            </Alert>
          )}

          <Box flexGrow={1} />

          <Button
            variant="contained"
            size="large"
            disabled={!canSubmit}
            onClick={handleSave}
            sx={{
              py: 1.25,
              px: 4,
              fontWeight: 700,
              borderRadius: 1.5,
              whiteSpace: "nowrap",
            }}
          >
            {isSaving ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              `PLACE ORDER`
            )}
          </Button>
        </Box>
      </Box>

      {/* Submission modal — sequential verification steps, then success or error state */}
      <Dialog
        open={submitOpen}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogContent sx={{ p: 4 }}>
          {submitStatus === "error" ? (
            <Fade in>
              <Box textAlign="center" py={2}>
                <ErrorIcon
                  sx={{ fontSize: 56, color: "error.main", mb: 1.5 }}
                />
                <Typography variant="h6" fontWeight={800} mb={0.5}>
                  Oops, ran into a problem
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try again later or check your network connection.
                </Typography>
              </Box>
            </Fade>
          ) : submitStatus === "success" ? (
            <Fade in>
              <Box textAlign="center" py={2}>
                <TaskAltIcon
                  sx={{ fontSize: 56, color: "success.main", mb: 1.5 }}
                />
                <Typography variant="h6" fontWeight={800} mb={0.5}>
                  Bill Generated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The document has been saved successfully.
                </Typography>
              </Box>
            </Fade>
          ) : (
            <Box py={1}>
              <Typography
                variant="h6"
                fontWeight={800}
                mb={3}
                textAlign="center"
              >
                Processing Transaction
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {SUBMIT_STEPS.map((step, idx) => {
                  const isDone = idx < activeStepIndex;
                  const isActive = idx === activeStepIndex;
                  return (
                    <Box
                      key={step.key}
                      display="flex"
                      alignItems="center"
                      gap={1.5}
                      sx={{
                        opacity: isDone || isActive ? 1 : 0.4,
                        transition: "opacity 0.3s ease",
                      }}
                    >
                      {isDone ? (
                        <CheckCircleIcon
                          sx={{ color: "success.main", fontSize: 22 }}
                        />
                      ) : isActive ? (
                        <CircularProgress size={18} thickness={5} />
                      ) : (
                        <PendingIcon
                          sx={{ color: "text.disabled", fontSize: 22 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        fontWeight={isActive ? 700 : 500}
                        color={
                          isDone || isActive ? "text.primary" : "text.disabled"
                        }
                      >
                        {step.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        {submitStatus !== "running" && (
          <DialogActions sx={{ px: 4, pb: 3, pt: 0 }}>
            {submitStatus === "error" ? (
              <>
                <Button onClick={handleCloseOnError} color="inherit">
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleRetry}
                  sx={{ borderRadius: 1.5 }}
                >
                  Try Again
                </Button>
              </>
            ) : (
              <Button
                fullWidth
                variant="contained"
                onClick={handleModalOk}
                sx={{ borderRadius: 1.5, py: 1.2, fontWeight: 700 }}
              >
                OK
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
