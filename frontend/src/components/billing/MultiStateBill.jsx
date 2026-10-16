import { useState, useMemo } from "react";
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
  FormControlLabel,
  Checkbox,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  CircularProgress,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  PURITIES,
  INDIA_STATES,
  SUPPLIER_STATE_CODE,
  SUPPLIER_STATE_NAME,
  SUPPLIER_GSTIN,
  determineSupplyType,
  SUPPLY_TYPE_LABELS,
  calculateMultiStateItemValue,
} from "../../utils/billingMath";

const BILLS_API_BASE = "http://localhost:8090/api/bills";

const EMPTY_ENTRY = (goldRate) => ({
  name: "",
  hsnCode: "",
  purity: "22K",
  weight: "",
  rate: goldRate,
  makingPercent: "",
  stoneValue: "",
  metalGstPercent: 3,
  makingGstPercent: 5,
  stoneGstPercent: 0.25,
});

export default function MultiStateBill({ goldRate, onSaveSuccess, notify }) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    buyerGstin: "",
    buyerPan: "",
    buyerStateCode: SUPPLIER_STATE_CODE,
    isSez: false,
    items: [],
  });
  const [entryItem, setEntryItem] = useState(EMPTY_ENTRY(goldRate));

  const buyerState =
    INDIA_STATES.find((s) => s.code === form.buyerStateCode)?.name || "";
  const supplyType = useMemo(
    () => determineSupplyType(form.buyerStateCode, form.isSez),
    [form.buyerStateCode, form.isSez],
  );

  const summary = useMemo(() => {
    let subtotal = 0,
      cgst = 0,
      sgst = 0,
      igst = 0,
      utgst = 0,
      grandTotal = 0;
    form.items.forEach((item) => {
      const vals = calculateMultiStateItemValue(
        item,
        { GOLD: { rate: goldRate } },
        supplyType,
      );
      const qty = item.quantity || 1;
      subtotal += vals.taxableValue * qty;
      cgst += vals.cgst * qty;
      sgst += vals.sgst * qty;
      igst += vals.igst * qty;
      utgst += vals.utgst * qty;
      grandTotal += vals.netTotal * qty;
    });
    return { subtotal, cgst, sgst, igst, utgst, total: grandTotal };
  }, [form.items, goldRate, supplyType]);

  const handleAddItem = () => {
    if (!entryItem.name || !entryItem.weight) {
      notify("Fill Item Description and Weight", "warning");
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...entryItem, id: Date.now(), quantity: 1 }],
    }));
    setEntryItem(EMPTY_ENTRY(goldRate));
  };

  const handleSave = async () => {
    if (!form.customer.trim()) {
      notify("Enter customer / buyer name.", "warning");
      return;
    }
    if (!form.isSez && !form.buyerStateCode) {
      notify("Select the buyer's state.", "warning");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        id: `MST-${Date.now().toString().slice(-5)}`,
        type: "Sale",
        orderType: "MULTISTATE",
        date: new Date().toISOString().split("T")[0],
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        total: Math.round(summary.total),
        gst: Math.round(summary.cgst + summary.sgst + summary.igst + summary.utgst),
        status: "Completed",
        buyerGstin: form.buyerGstin,
        buyerPan: form.buyerPan,
        buyerState,
        buyerStateCode: form.buyerStateCode,
        isSez: form.isSez,
        items: form.items.map((item) => {
          const vals = calculateMultiStateItemValue(
            item,
            { GOLD: { rate: goldRate } },
            supplyType,
          );
          return {
            name: item.name,
            hsnCode: item.hsnCode || "",
            purity: item.purity,
            weight: vals.totalWeight,
            quantity: item.quantity || 1,
            rate: Number(item.rate || goldRate),
            stoneValue: Number(item.stoneValue || 0),
            makingPercent: Number(item.makingPercent || 0),
            metalGstPercent: Number(item.metalGstPercent ?? 3),
            makingGstPercent: Number(item.makingGstPercent ?? 5),
            stoneGstPercent: Number(item.stoneGstPercent ?? 0.25),
            mrp: vals.netTotal,
          };
        }),
      };
      const res = await fetch(BILLS_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaveSuccess();
    } catch {
      notify("Error generating document.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={8}>
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
          <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
            SUPPLIER (FIXED)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            GSTIN: {SUPPLIER_GSTIN} · State: {SUPPLIER_STATE_NAME} (
            {SUPPLIER_STATE_CODE})
          </Typography>
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
          <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
            1. BUYER / PLACE OF SUPPLY
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Buyer Name / Entity"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact / Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Buyer GSTIN (blank = B2C)"
                value={form.buyerGstin}
                onChange={(e) =>
                  setForm({ ...form, buyerGstin: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Buyer PAN"
                value={form.buyerPan}
                onChange={(e) => setForm({ ...form, buyerPan: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small" disabled={form.isSez}>
                <InputLabel>Buyer State / UT</InputLabel>
                <Select
                  value={form.buyerStateCode}
                  label="Buyer State / UT"
                  onChange={(e) =>
                    setForm({ ...form, buyerStateCode: e.target.value })
                  }
                >
                  {INDIA_STATES.map((s) => (
                    <MenuItem key={s.code} value={s.code}>
                      {s.code} — {s.name}
                      {s.isUT ? " (UT)" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.isSez}
                    onChange={(e) =>
                      setForm({ ...form, isSez: e.target.checked })
                    }
                  />
                }
                label="Supply to SEZ Unit / Developer (zero-rated under LUT)"
              />
            </Grid>
            <Grid item xs={12}>
              <Chip
                label={SUPPLY_TYPE_LABELS[supplyType]}
                color={
                  supplyType === "ZERO_RATED"
                    ? "success"
                    : supplyType === "INTER_STATE"
                      ? "secondary"
                      : "primary"
                }
                sx={{ fontWeight: 700 }}
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
          <Typography variant="subtitle2" color="primary" fontWeight={700} mb={2}>
            2. TRANSACTION ITEMS
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: "surface.light",
              borderRadius: 2,
              border: "1px dashed",
              borderColor: "primary.main",
              mb: 3,
            }}
          >
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
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="HSN Code"
                  value={entryItem.hsnCode}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, hsnCode: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Weight (g)"
                  type="number"
                  value={entryItem.weight}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, weight: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Purity</InputLabel>
                  <Select
                    value={entryItem.purity}
                    label="Purity"
                    onChange={(e) =>
                      setEntryItem({ ...entryItem, purity: e.target.value })
                    }
                  >
                    {PURITIES.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rate (₹/g)"
                  type="number"
                  value={entryItem.rate}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, rate: e.target.value })
                  }
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center" mb={2}>
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
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Stone / Diamond Value (₹)"
                  type="number"
                  value={entryItem.stoneValue}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, stoneValue: e.target.value })
                  }
                />
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }}>
              PER-COMPONENT GST RATES (editable — default 3% / 5% / 0.25%)
            </Divider>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Metal GST %"
                  type="number"
                  value={entryItem.metalGstPercent}
                  onChange={(e) =>
                    setEntryItem({
                      ...entryItem,
                      metalGstPercent: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Making GST %"
                  type="number"
                  value={entryItem.makingGstPercent}
                  onChange={(e) =>
                    setEntryItem({
                      ...entryItem,
                      makingGstPercent: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Diamond/Stone GST %"
                  type="number"
                  value={entryItem.stoneGstPercent}
                  onChange={(e) =>
                    setEntryItem({
                      ...entryItem,
                      stoneGstPercent: e.target.value,
                    })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAddItem}
                  disabled={!entryItem.name || !entryItem.weight}
                >
                  Add Item
                </Button>
              </Grid>
            </Grid>
          </Box>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ boxShadow: "none" }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: "background.default" }}>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Wt (g)</TableCell>
                  <TableCell align="right">Taxable</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Net</TableCell>
                  <TableCell align="center">Act</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((item, idx) => {
                  const vals = calculateMultiStateItemValue(
                    item,
                    { GOLD: { rate: goldRate } },
                    supplyType,
                  );
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.purity} {item.hsnCode ? `· HSN ${item.hsnCode}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{vals.totalWeight}g</TableCell>
                      <TableCell align="right">
                        ₹{Math.round(vals.taxableValue).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ₹{Math.round(vals.totalTax).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        ₹{Math.round(vals.netTotal).toLocaleString()}
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
      <Grid item xs={12} md={4}>
        <Box sx={{ position: "sticky", top: 24 }}>
          <Card
            sx={{
              p: 4,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <Typography variant="subtitle2" color="primary" fontWeight={700} mb={3}>
              BILL SUMMARY
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2">Taxable Value</Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{Math.round(summary.subtotal).toLocaleString()}
              </Typography>
            </Box>
            {supplyType === "ZERO_RATED" && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography variant="body2">GST</Typography>
                <Typography variant="body2" fontWeight={600}>
                  NIL (LUT)
                </Typography>
              </Box>
            )}
            {supplyType === "INTRA_STATE" && (
              <>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2">CGST</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{Math.round(summary.cgst).toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2">SGST</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{Math.round(summary.sgst).toLocaleString()}
                  </Typography>
                </Box>
              </>
            )}
            {supplyType === "UNION_TERRITORY" && (
              <>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2">CGST</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{Math.round(summary.cgst).toLocaleString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1.5}>
                  <Typography variant="body2">UTGST</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ₹{Math.round(summary.utgst).toLocaleString()}
                  </Typography>
                </Box>
              </>
            )}
            {supplyType === "INTER_STATE" && (
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography variant="body2">IGST</Typography>
                <Typography variant="body2" fontWeight={600}>
                  ₹{Math.round(summary.igst).toLocaleString()}
                </Typography>
              </Box>
            )}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              bgcolor="goldAccent.lightBg"
              borderRadius={2}
              border="1px dashed"
              borderColor="goldAccent.main"
              mb={2}
              mt={2}
            >
              <Typography variant="subtitle1" fontWeight={800} color="goldAccent.text">
                GRAND TOTAL
              </Typography>
              <Typography variant="h5" fontWeight={800} color="goldAccent.text">
                ₹{Math.round(summary.total).toLocaleString()}
              </Typography>
            </Box>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={
                form.items.length === 0 ||
                !form.customer ||
                isSaving ||
                (!form.isSez && !form.buyerStateCode)
              }
              onClick={handleSave}
              sx={{ py: 1.5, fontWeight: 700 }}
            >
              {isSaving ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `ISSUE DOCUMENT`
              )}
            </Button>
          </Card>
        </Box>
      </Grid>
    </Grid>
  );
}
