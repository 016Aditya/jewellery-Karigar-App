import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Skeleton,
} from "@mui/material";
import {
  FlightTakeoff,
  Storefront,
  Build,
  Sell,
  Apps,
  Public,
  ReceiptLong,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  PictureAsPdf,
} from "@mui/icons-material";
import { useSelector, useDispatch } from "react-redux";
import StatusTag from "../components/StatusTag";
import GenerateBill from "../components/billing/GenerateBill";
import { apiSlice, useGetBillsQuery } from "../features/api/apiSlice";
import { getMetalColor } from "../utils/metalColors";
const BILLS_API_BASE = "http://localhost:8090/api/bills";

// PDF invoice generation exists server-side for these order types only (Purchase/Repair
// don't have a dedicated template yet).
const PDF_SUPPORTED_ORDER_TYPES = ["DOMESTIC", "EXPORT", "MULTISTATE"];

const FILTERS = [
  { value: "DOMESTIC", label: "Domestic", icon: Storefront },
  { value: "MULTISTATE", label: "Multi-State", icon: Public },
  { value: "EXPORT", label: "Exports", icon: FlightTakeoff },
  { value: "PURCHASE", label: "Purchases", icon: Sell },
  { value: "REPAIR", label: "Repairs", icon: Build },
  { value: "ALL", label: "All Bills", icon: Apps },
];

const orderTypeIcon = (orderType) => {
  if (orderType === "EXPORT") return <FlightTakeoff />;
  if (orderType === "MULTISTATE") return <Public />;
  if (orderType === "PURCHASE") return <Sell />;
  if (orderType === "REPAIR") return <Build />;
  return <Storefront />;
};

function BillCardSkeleton() {
  return (
    <Card
      sx={{
        p: 2.5,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box display="flex" alignItems="center" gap={3}>
        <Skeleton variant="rounded" width={44} height={44} />
        <Box>
          <Skeleton width={120} height={16} sx={{ mb: 0.5 }} />
          <Skeleton width={160} height={22} sx={{ mb: 0.5 }} />
          <Skeleton width={140} height={14} />
        </Box>
      </Box>
      <Box display="flex" gap={1.5} alignItems="center">
        <Box textAlign="right" mr={2}>
          <Skeleton width={60} height={14} sx={{ ml: "auto", mb: 0.5 }} />
          <Skeleton width={80} height={24} sx={{ ml: "auto" }} />
        </Box>
        <Skeleton variant="rounded" width={70} height={28} />
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </Box>
    </Card>
  );
}

export default function Billing() {
  const [view, setView] = useState("list");
  const [toast, setToast] = useState(null);
  const dispatch = useDispatch();

  const { rates = {} } = useSelector((state) => state.ui) || {};

  // Default to Domestic — it's the common case and the cheapest first load; ALL and
  // the other transaction types are fetched only once the user actually picks that tab.
  const [billFilter, setBillFilter] = useState("DOMESTIC");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewBillId, setViewBillId] = useState(null);
  const [viewBillData, setViewBillData] = useState(null);
  const [isLoadingViewBill, setIsLoadingViewBill] = useState(false);
  const [viewBillError, setViewBillError] = useState(false);

  // FIX: Track the specific ID being processed to prevent all rows from buffering
  const [pdfGeneratingId, setPdfGeneratingId] = useState(null);

  const notify = (msg, severity = "success") => setToast({ msg, severity });

  // RTK Query caches each tab's results under its own key — switching tabs you've already
  // visited this session is instant (no refetch); the cache is only invalidated when a new
  // bill is actually issued (see handleSaveSuccess below).
  const { data: bills = [], isFetching: isFetchingBills } =
    useGetBillsQuery(billFilter);

  const handleViewBill = async (id) => {
    // Open the modal immediately with a skeleton — don't wait on the network before
    // giving feedback that the click registered.
    setViewDialogOpen(true);
    setViewBillId(id);
    setViewBillData(null);
    setViewBillError(false);
    setIsLoadingViewBill(true);
    try {
      const res = await fetch(`${BILLS_API_BASE}/${id}`);
      if (!res.ok) throw new Error("Failed to fetch bill");
      setViewBillData(await res.json());
    } catch (err) {
      setViewBillError(true);
    } finally {
      setIsLoadingViewBill(false);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewBillId(null);
    setViewBillData(null);
    setViewBillError(false);
  };

  const handlePrintPdf = async (id) => {
    try {
      setPdfGeneratingId(id); // Only buffer the clicked row

      const response = await fetch(`${BILLS_API_BASE}/${id}/pdf`, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const newTab = window.open(url, "_blank");

      if (newTab) {
        newTab.focus();
      } else {
        notify("Please allow popups to view the PDF.", "warning");
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      notify("Could not generate PDF.", "error");
    } finally {
      setPdfGeneratingId(null); // Stop buffering
    }
  };

  const handleSaveSuccess = () => {
    notify("Transaction completed successfully!", "success");
    // A new bill was actually issued — this is the one moment the cached bill lists
    // should be considered stale. Every RTK Query "Bills" cache entry (ALL/DOMESTIC/etc.)
    // is invalidated and will refetch next time it's used.
    dispatch(apiSlice.util.invalidateTags(["Bills"]));
    setBillFilter("DOMESTIC");
    setView("list");
  };

  if (view === "create") {
    return (
      <GenerateBill
        rates={rates}
        onBack={() => setView("list")}
        onSaveSuccess={handleSaveSuccess}
        notify={notify}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Transaction Log
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => setView("create")}
          startIcon={<ReceiptLong />}
          sx={{ fontWeight: 700, px: 3, py: 1.2, borderRadius: 2 }}
        >
          New Order
        </Button>
      </Box>

      {/* Evenly-spread filter cards — same pattern as the Catalogue metal tabs */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        {FILTERS.map(({ value, label, icon: Icon }) => {
          const active = value === billFilter;
          return (
            <Card
              key={value}
              onClick={() => setBillFilter(value)}
              sx={{
                flex: "1 1 0",
                minWidth: 130,
                p: 1.5,
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid",
                borderColor: active ? "primary.main" : "divider",
                bgcolor: active ? "primary.light" : "background.paper",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={0.7}
              >
                <Icon
                  sx={{
                    fontSize: 18,
                    color: active ? "primary.contrastText" : "text.secondary",
                  }}
                />
                <Typography
                  fontSize={13}
                  fontWeight={700}
                  color={active ? "primary.contrastText" : "text.primary"}
                >
                  {label}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>

      {isFetchingBills ? (
        <Box display="flex" flexDirection="column" gap={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <BillCardSkeleton key={i} />
          ))}
        </Box>
      ) : bills.length === 0 ? (
        <Card
          sx={{
            p: 6,
            textAlign: "center",
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            boxShadow: "none",
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No records found.
          </Typography>
        </Card>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {bills.map((b) => (
            <Card
              key={b.id}
              sx={{
                p: 2.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box display="flex" alignItems="center" gap={3}>
                <Box
                  sx={{
                    bgcolor: "background.default",
                    border: "1px solid",
                    borderColor: "divider",
                    p: 1.5,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                >
                  {orderTypeIcon(b.orderType)}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="primary"
                    fontFamily="monospace"
                    fontWeight={700}
                  >
                    {b.id} • {b.orderType}
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {b.customer}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.date} • {b.phone}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" gap={1.5} alignItems="center">
                <Box textAlign="right" mr={2}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Amount
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    ₹{(b.total || 0).toLocaleString()}
                  </Typography>
                </Box>
                <StatusTag status={b.status} />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleViewBill(b.id)}
                  startIcon={<VisibilityIcon />}
                  sx={{ borderRadius: 1.5 }}
                >
                  View
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="secondary"
                  // CHECK: Only disable and show spinner if THIS specific ID is being generated
                  disabled={
                    !!pdfGeneratingId ||
                    !PDF_SUPPORTED_ORDER_TYPES.includes(b.orderType)
                  }
                  onClick={() => handlePrintPdf(b.id)}
                  startIcon={
                    pdfGeneratingId === b.id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PictureAsPdf />
                    )
                  }
                  sx={{ borderRadius: 1.5, boxShadow: "none" }}
                >
                  {pdfGeneratingId === b.id ? "..." : "Invoice"}
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* --- VIEW BILL MODAL --- */}

      <Dialog
        open={viewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 2,
            pt: 2.5,
            bgcolor: "background.default",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Quick Summary
            </Typography>
            {viewBillData && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontFamily="monospace"
                sx={{ letterSpacing: 0.3 }}
              >
                {viewBillData.id} • {viewBillData.date}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={handleCloseViewDialog}
            size="small"
            sx={{
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "action.selected" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        {isLoadingViewBill ? (
          <DialogContent sx={{ p: 4 }}>
            <Grid container spacing={4} mb={4}>
              <Grid item xs={12} sm={6}>
                <Skeleton width={80} height={14} sx={{ mb: 1 }} />
                <Skeleton width={160} height={22} sx={{ mb: 0.5 }} />
                <Skeleton width={120} height={16} />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ textAlign: "right" }}>
                <Skeleton
                  variant="rounded"
                  width={90}
                  height={26}
                  sx={{ ml: "auto" }}
                />
              </Grid>
            </Grid>
            <Skeleton variant="rounded" height={140} sx={{ mb: 4 }} />
            <Skeleton variant="rounded" height={72} />
          </DialogContent>
        ) : viewBillError ? (
          <DialogContent sx={{ p: 4 }}>
            <Box textAlign="center" py={4} color="text.secondary">
              <Typography fontSize={40}>⚠️</Typography>
              <Typography variant="h6" mt={1}>
                Network failed
              </Typography>
              <Typography variant="body2" mb={2}>
                Could not load this bill. Please try again.
              </Typography>
              <Button
                variant="outlined"
                onClick={() => viewBillId && handleViewBill(viewBillId)}
                sx={{ borderRadius: 1.5 }}
              >
                Retry
              </Button>
            </Box>
          </DialogContent>
        ) : viewBillData ? (
          <>
            <DialogContent
              sx={{ p: 4, display: "flex", flexDirection: "column" }}
            >
              <Grid container spacing={4} mb={3} sx={{ flexShrink: 0 }}>
                <Grid item xs={12} sm={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.6}
                    display="block"
                    mb={1}
                  >
                    BILLED TO
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {viewBillData.customer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {viewBillData.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: "right" }}>
                  <Chip
                    label={viewBillData.orderType}
                    color="primary"
                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                  />
                </Grid>
              </Grid>

              {/* Scrollable items table — caps height so long bills don't blow up the dialog */}
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  boxShadow: "none",
                  mb: 3,
                  borderRadius: 2,
                  borderColor: "divider",
                  maxHeight: 320,
                  overflowY: "auto",
                  flexShrink: 0,
                }}
              >
                <Table size="small" stickyHeader>
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
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Total Weight</TableCell>
                      <TableCell align="right">GST (₹)</TableCell>
                      <TableCell align="right">Amount (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewBillData.items?.map((item, idx) => (
                      <TableRow
                        key={idx}
                        sx={{
                          "&:hover": { bgcolor: "action.hover" },
                          "&:last-child td": { borderBottom: 0 },
                          "& td": { borderColor: "divider", py: 1.4 },
                        }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                flexShrink: 0,
                                bgcolor: getMetalColor(item.metalType),
                                border: "1px solid rgba(0,0,0,0.15)",
                              }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {item.name}
                              </Typography>
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={0.75}
                                mt={0.25}
                              >
                                <Chip
                                  label={(item.metalType || "").replace(
                                    "_",
                                    " ",
                                  )}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: 0.3,
                                    borderRadius: 0.75,
                                    bgcolor: `${getMetalColor(item.metalType)}33`,
                                    color: "text.primary",
                                    border: "1px solid",
                                    borderColor: getMetalColor(item.metalType),
                                    "& .MuiChip-label": { px: 0.75 },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {item.purity}
                                  {item.oldWeight > 0
                                    ? ` · Inc. ${item.oldWeight}g Old Gold`
                                    : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {item.quantity || 1}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {item.weight}g
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            ₹
                            {Math.round(
                              (item.gstPercent * item.mrp) / 100,
                            ).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            ₹{Math.round(item.mrp || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Summary — spread horizontally into three equal-width columns instead of stacked rows */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRight: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    SUBTOTAL
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} mt={0.5}>
                    ₹
                    {Math.round(
                      (viewBillData.total || 0) - (viewBillData.gst || 0),
                    ).toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    borderRight: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    TAXES
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} mt={0.5}>
                    ₹{Math.round(viewBillData.gst || 0).toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    textAlign: "center",
                    bgcolor: "goldAccent.lightBg",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="goldAccent.text"
                    fontWeight={700}
                    letterSpacing={0.5}
                  >
                    GRAND TOTAL
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    color="goldAccent.text"
                    mt={0.5}
                  >
                    ₹{Math.round(viewBillData.total || 0).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                p: 3,
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <Button
                onClick={handleCloseViewDialog}
                color="inherit"
                sx={{ borderRadius: 1.5 }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={
                  pdfGeneratingId === viewBillData.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <PictureAsPdf />
                  )
                }
                onClick={() => handlePrintPdf(viewBillData.id)}
                disabled={
                  !PDF_SUPPORTED_ORDER_TYPES.includes(viewBillData.orderType) ||
                  pdfGeneratingId === viewBillData.id
                }
                sx={{ borderRadius: 1.5 }}
              >
                {pdfGeneratingId === viewBillData.id
                  ? "Generating..."
                  : "Download Official Invoice"}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast?.severity || "info"} variant="filled">
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
