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
import { PURITIES, calculateItemValue } from "../../utils/billingMath";

const BILLS_API_BASE = "http://localhost:8090/api/bills";

export default function RepairBill({ goldRate, onSaveSuccess, notify }) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ customer: "", phone: "", items: [] });

  // Custom Entry State tailored specifically for Repairs
  const [entryItem, setEntryItem] = useState({
    name: "",
    purity: "22K",
    newWeight: "", // Added metal weight
    oldWeight: "", // Weight of item brought in
    rate: goldRate,
    laborAmount: "",
    gstPercent: 3, // Applicable to added metal
  });

  const summary = useMemo(() => {
    let subtotal = 0,
      totalGst = 0,
      grandTotal = 0;
    form.items.forEach((item) => {
      const vals = calculateItemValue(item, "REPAIR", goldRate);
      const qty = item.quantity || 1;
      subtotal += vals.taxableValue * qty;
      totalGst += vals.gstAmount * qty;
      grandTotal += vals.netTotal * qty;
    });
    return { subtotal, gst: totalGst, total: grandTotal };
  }, [form.items, goldRate]);

  const handleAddCustomItem = () => {
    if (!entryItem.name) {
      notify("Please provide an Item Description.", "warning");
      return;
    }
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...entryItem, id: Date.now(), quantity: 1 }],
    }));
    setEntryItem({
      name: "",
      purity: "22K",
      newWeight: "",
      oldWeight: "",
      rate: goldRate,
      laborAmount: "",
      gstPercent: 3,
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {
        id: `INV-${Date.now().toString().slice(-5)}`,
        type: "Sale",
        orderType: "REPAIR",
        date: new Date().toISOString().split("T")[0],
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        total: Math.round(summary.total),
        gst: Math.round(summary.gst),
        status: "Completed",
        items: form.items.map((item) => {
          const vals = calculateItemValue(item, "REPAIR", goldRate);
          return {
            name: item.name,
            purity: item.purity,
            weight: vals.totalWeight,
            oldWeight: Number(item.oldWeight || 0),
            gstPercent: Number(item.gstPercent || 3),
            quantity: item.quantity || 1,
            rate: Number(item.rate || goldRate),
            laborAmount: Number(item.laborAmount || 0),
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
    } catch (err) {
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
          <Typography
            variant="subtitle2"
            color="primary"
            fontWeight={700}
            mb={2}
          >
            2. CUSTOMER DETAILS
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
            3. REPAIR SERVICE DETAILS
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
                  label="Service Desc"
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
                  label="Added Metal (g)"
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
                  label="Item Wt (g)"
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
                  label="Rate (₹/g)"
                  type="number"
                  value={entryItem.rate}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, rate: e.target.value })
                  }
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Labor Charge (₹)"
                  type="number"
                  value={entryItem.laborAmount}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, laborAmount: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Metal GST (%)"
                  type="number"
                  value={entryItem.gstPercent}
                  onChange={(e) =>
                    setEntryItem({ ...entryItem, gstPercent: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={6} mt={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleAddCustomItem}
                  disabled={!entryItem.name}
                >
                  Add Repair Job
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
                  <TableCell>Service</TableCell>
                  <TableCell align="right">Added Wt</TableCell>
                  <TableCell align="right">Labor + Metal</TableCell>
                  <TableCell align="right">GST (18% / 3%)</TableCell>
                  <TableCell align="right">Net Total</TableCell>
                  <TableCell align="center">Act</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {form.items.map((item, idx) => {
                  const vals = calculateItemValue(item, "REPAIR", goldRate);
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
                      <TableCell align="right">
                        {item.newWeight || 0}g
                      </TableCell>
                      <TableCell align="right">
                        ₹{Math.round(vals.taxableValue).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ₹{Math.round(vals.gstAmount).toLocaleString()}
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
            <Typography
              variant="subtitle2"
              color="primary"
              fontWeight={700}
              mb={3}
            >
              SERVICE INVOICE SUMMARY
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2">Service Value</Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{Math.round(summary.subtotal).toLocaleString()}
              </Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1.5}>
              <Typography variant="body2">GST (Split 18% / 3%)</Typography>
              <Typography variant="body2" fontWeight={600}>
                ₹{Math.round(summary.gst).toLocaleString()}
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

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={form.items.length === 0 || !form.customer || isSaving}
              onClick={handleSave}
              sx={{ py: 1.5, fontWeight: 700 }}
            >
              {isSaving ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `ISSUE INVOICE`
              )}
            </Button>
          </Card>
        </Box>
      </Grid>
    </Grid>
  );
}
