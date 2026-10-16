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
import QuantityStepper from "../QuantityStepper";
import { PURITIES, calculateItemValue } from "../../utils/billingMath";

const BILLS_API_BASE = "http://localhost:8090/api/bills";

export default function ExportBill({
  goldRate,
  categories,
  products,
  onSaveSuccess,
  notify,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    lutNumber: "",
    iecCode: "",
    adCode: "",
    exchangeRate: "",
    portOfLoading: "",
    portOfDischarge: "",
    consigneeVat: "",
    consigneeAddress: "",
    consigneeCountry: "",
    incoterms: "",
    modeOfTransport: "",
    vesselFlightNo: "",
    billOfLadingNo: "",
    shippingBillNo: "",
    letExportOrder: "",
    packingDetails: "",
    grossWeightPacked: "",
    countryOfOrigin: "India",
    countryOfDestination: "",
    freightCharges: "",
    insuranceCharges: "",
    items: [],
  });
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [entryItem, setEntryItem] = useState({
    name: "",
    hsnCode: "",
    purity: "22K",
    newWeight: "",
    oldWeight: "",
    oldPrice: "",
    rate: goldRate,
    makingPercent: "",
    stoneValue: "",
  });

  const filteredProducts = useMemo(
    () => products.filter((item) => item.categoryId === selectedCatId),
    [products, selectedCatId],
  );

  const summary = useMemo(() => {
    let subtotal = 0,
      grandTotal = 0;
    form.items.forEach((item) => {
      const vals = calculateItemValue(item, "EXPORT", goldRate);
      const qty = item.quantity || 1;
      subtotal += vals.taxableValue * qty;
      grandTotal += vals.netTotal * qty;
    });
    return { subtotal, gst: 0, total: grandTotal };
  }, [form.items, goldRate]);

  const handleAddCatalogueItem = () => {
    const p = products.find((x) => x.id === selectedProductId);
    if (!p) return;
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...p, quantity: 1 }],
    }));
    setSelectedCatId("");
    setSelectedProductId("");
  };

  const handleAddCustomItem = () => {
    if (!entryItem.name || !entryItem.newWeight) {
      notify("Fill Item Desc and New Weight", "warning");
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...entryItem, id: Date.now(), quantity: 1 }],
    }));
    setEntryItem({
      name: "",
      hsnCode: "",
      purity: "22K",
      newWeight: "",
      oldWeight: "",
      oldPrice: "",
      rate: goldRate,
      makingPercent: "",
      stoneValue: "",
    });
  };

  const handleSave = async () => {
    if (!form.exchangeRate || Number(form.exchangeRate) <= 0) {
      notify("Enter valid exchange rate.", "warning");
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        id: `EXP-${Date.now().toString().slice(-5)}`,
        type: "Sale",
        orderType: "EXPORT",
        date: new Date().toISOString().split("T")[0],
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        total: Math.round(summary.total),
        gst: 0,
        status: "Completed",
        lutNumber: form.lutNumber,
        iecCode: form.iecCode,
        adCode: form.adCode,
        exchangeRate: Number(form.exchangeRate),
        portOfLoading: form.portOfLoading,
        portOfDischarge: form.portOfDischarge,
        consigneeVat: form.consigneeVat,
        consigneeAddress: form.consigneeAddress,
        consigneeCountry: form.consigneeCountry,
        incoterms: form.incoterms,
        modeOfTransport: form.modeOfTransport,
        vesselFlightNo: form.vesselFlightNo,
        billOfLadingNo: form.billOfLadingNo,
        shippingBillNo: form.shippingBillNo,
        letExportOrder: form.letExportOrder,
        packingDetails: form.packingDetails,
        grossWeightPacked: form.grossWeightPacked
          ? Number(form.grossWeightPacked)
          : null,
        countryOfOrigin: form.countryOfOrigin,
        countryOfDestination: form.countryOfDestination,
        freightCharges: form.freightCharges ? Number(form.freightCharges) : 0,
        insuranceCharges: form.insuranceCharges
          ? Number(form.insuranceCharges)
          : 0,
        items: form.items.map((item) => {
          const vals = calculateItemValue(item, "EXPORT", goldRate);
          return {
            name: item.name,
            hsnCode: item.hsnCode || "",
            purity: item.purity,
            weight: vals.totalWeight,
            oldWeight: Number(item.oldWeight || 0),
            oldPrice: Number(item.oldPrice || 0),
            quantity: item.quantity || 1,
            rate: Number(item.rate || goldRate),
            stoneValue: Number(item.stoneValue || 0),
            makingPercent: Number(item.makingPercent || 0),
            mrp: vals.netTotal,
            fobUsd: vals.netTotal / Number(form.exchangeRate),
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
    } catch (err) {
      notify("Error generating document.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={8}>
        {/* Extracted Export Card specifically for this view */}
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
          >
            EXPORT DECLARATION (ZERO-RATED SUPPLY)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="LUT Number"
                value={form.lutNumber}
                onChange={(e) =>
                  setForm({ ...form, lutNumber: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="IEC Code"
                value={form.iecCode}
                onChange={(e) => setForm({ ...form, iecCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="AD Code"
                value={form.adCode}
                onChange={(e) => setForm({ ...form, adCode: e.target.value })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="RBI Exc. Rate (₹/USD)"
                type="number"
                value={form.exchangeRate}
                onChange={(e) =>
                  setForm({ ...form, exchangeRate: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Port of Loading"
                value={form.portOfLoading}
                onChange={(e) =>
                  setForm({ ...form, portOfLoading: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Port of Discharge"
                value={form.portOfDischarge}
                onChange={(e) =>
                  setForm({ ...form, portOfDischarge: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Consignee VAT/EORI"
                value={form.consigneeVat}
                onChange={(e) =>
                  setForm({ ...form, consigneeVat: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </Card>

        {/* Shipping & customs details — reference: SLS_Export_Invoice.pdf */}
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
          >
            SHIPPING & CUSTOMS DETAILS
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Consignee Address"
                value={form.consigneeAddress}
                onChange={(e) =>
                  setForm({ ...form, consigneeAddress: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Consignee Country"
                value={form.consigneeCountry}
                onChange={(e) =>
                  setForm({ ...form, consigneeCountry: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Incoterms</InputLabel>
                <Select
                  value={form.incoterms}
                  label="Incoterms"
                  onChange={(e) =>
                    setForm({ ...form, incoterms: e.target.value })
                  }
                >
                  {["EXW", "FOB", "CFR", "CIF", "DAP", "DDP"].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Mode of Transport</InputLabel>
                <Select
                  value={form.modeOfTransport}
                  label="Mode of Transport"
                  onChange={(e) =>
                    setForm({ ...form, modeOfTransport: e.target.value })
                  }
                >
                  {[
                    "Sea Freight (FCL)",
                    "Sea Freight (LCL)",
                    "Air Freight",
                    "Courier",
                  ].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Vessel / Flight No"
                value={form.vesselFlightNo}
                onChange={(e) =>
                  setForm({ ...form, vesselFlightNo: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Bill of Lading No"
                value={form.billOfLadingNo}
                onChange={(e) =>
                  setForm({ ...form, billOfLadingNo: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Shipping Bill No"
                value={form.shippingBillNo}
                onChange={(e) =>
                  setForm({ ...form, shippingBillNo: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Let Export Order (LEO)"
                value={form.letExportOrder}
                onChange={(e) =>
                  setForm({ ...form, letExportOrder: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                label="Packing Details"
                value={form.packingDetails}
                onChange={(e) =>
                  setForm({ ...form, packingDetails: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Gross Weight Packed (g)"
                value={form.grossWeightPacked}
                onChange={(e) =>
                  setForm({ ...form, grossWeightPacked: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Country of Origin"
                value={form.countryOfOrigin}
                onChange={(e) =>
                  setForm({ ...form, countryOfOrigin: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                label="Country of Destination"
                value={form.countryOfDestination}
                onChange={(e) =>
                  setForm({ ...form, countryOfDestination: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Freight Charges (₹)"
                value={form.freightCharges}
                onChange={(e) =>
                  setForm({ ...form, freightCharges: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Insurance (₹)"
                value={form.insuranceCharges}
                onChange={(e) =>
                  setForm({ ...form, insuranceCharges: e.target.value })
                }
              />
            </Grid>
          </Grid>
        </Card>

        {/* Customer & Items UI is structurally identical to Domestic, but without GST Inputs */}
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
          >
            2. CUSTOMER / CONSIGNEE DETAILS
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name / Entity"
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact / GSTIN"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
          >
            3. TRANSACTION ITEMS
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
            <Box display="flex" gap={2} mb={2}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCatId}
                  onChange={(e) => {
                    setSelectedCatId(e.target.value);
                    setSelectedProductId("");
                  }}
                  label="Category"
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
                sx={{ flex: 1 }}
                disabled={!selectedCatId}
              >
                <InputLabel>Product</InputLabel>
                <Select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  label="Product"
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
              >
                Add
              </Button>
            </Box>
            <Divider sx={{ my: 2 }}>OR CUSTOM ENTRY</Divider>
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
                  label="New Wt (g)"
                  type="number"
                  value={entryItem.newWeight}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, newWeight: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Purity</InputLabel>
                  <Select
                    value={entryItem.purity}
                    onChange={(e) =>
                      setEntryItem({ ...entryItem, purity: e.target.value })
                    }
                    label="Purity"
                  >
                    {PURITIES.map((p) => (
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
                    setEntryItem({ ...entryItem, oldWeight: e.target.value })
                  }
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
                    setEntryItem({ ...entryItem, oldPrice: e.target.value })
                  }
                />
              </Grid>
            </Grid>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
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
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Stones (₹)"
                  type="number"
                  value={entryItem.stoneValue}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, stoneValue: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={4} mt={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAddCustomItem}
                  disabled={!entryItem.name || !entryItem.newWeight}
                >
                  Add Custom Item
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
                  <TableCell align="right">Total Wt</TableCell>
                  <TableCell align="right">Taxable</TableCell>
                  <TableCell align="right" sx={{ color: "primary.main" }}>
                    FOB (USD)
                  </TableCell>
                  <TableCell align="center">Act</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((item, idx) => {
                  const vals = calculateItemValue(item, "EXPORT", goldRate);
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.purity}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{vals.totalWeight}g</TableCell>
                      <TableCell align="right">
                        ₹{Math.round(vals.taxableValue).toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "text.primary", fontWeight: 700 }}
                      >
                        $
                        {form.exchangeRate
                          ? (vals.netTotal / Number(form.exchangeRate)).toFixed(
                              2,
                            )
                          : "0.00"}
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
            <Typography
              variant="subtitle2"
              color="primary"
              fontWeight={700}
              mb={3}
            >
              BILL SUMMARY
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2">Taxable Value</Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{Math.round(summary.subtotal).toLocaleString()}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2">Total GST</Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹0 (LUT)
              </Typography>
            </Box>
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
              <Typography
                variant="subtitle1"
                fontWeight={800}
                color="goldAccent.text"
              >
                GRAND TOTAL
              </Typography>
              <Typography variant="h5" fontWeight={800} color="goldAccent.text">
                ₹{Math.round(summary.total).toLocaleString()}
              </Typography>
            </Box>
            <Box
              p={1.5}
              bgcolor="background.default"
              borderRadius={1}
              border="1px dashed"
              borderColor="divider"
              mb={2}
              textAlign="center"
            >
              <Typography variant="caption" fontWeight={700}>
                Export Value: $
                {form.exchangeRate
                  ? (summary.total / Number(form.exchangeRate)).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )
                  : "0.00"}{" "}
                USD
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
                !form.exchangeRate
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
