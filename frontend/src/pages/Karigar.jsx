import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  IconButton,
  CircularProgress,
  Stack,
  Paper,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  CheckCircle,
  Assignment,
  TrendingUp,
  TrendingDown,
  Payments,
  Close,
  PendingActions,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import {
  useLazyGetBillByIdQuery,
  useGetKarigarJobsQuery,
  useAssignKarigarJobMutation,
  useReceiveKarigarJobMutation,
  useGetFullTimeKarigarsQuery,
  useGetKarigarLedgerPuritiesQuery,
} from "../features/api/apiSlice";
import KarigarJobsTable from "../components/Karigar/KarigarJobsTable";
import AssignJobDialog from "../components/Karigar/AssignJobDialog";

// Standard wastage percentage per process — set process-wise, not per-metal.
const WORK_TYPES = {
  Casting: 4.0,
  Jadau: 6.0,
  "Stone Setting": 6.0,
  Polish: 1.0,
};

// Gold, White/Rose/Yellow Gold are all one purity family (karat-based) in the ledger
// registry — matches the same convention used for billing and the Karigar Gold Ledger.
const assetClassForMetal = (metalType) => {
  if (metalType === "SILVER") return "SILVER";
  if (metalType === "PLATINUM") return "PLATINUM";
  return "GOLD"; // GOLD, WHITE_GOLD, ROSE_GOLD, YELLOW_GOLD (and any unknown fallback)
};

function StatCard({ icon, label, value, accent }) {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          background: accent || theme.palette.goldAccent.lightBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.palette.goldAccent.text,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="h6"
          fontWeight={700}
          color="text.primary"
          lineHeight={1}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

function LabelValue({ label, value, valueColor }) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      py={0.6}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={600}
        color={valueColor || "text.primary"}
      >
        {value}
      </Typography>
    </Box>
  );
}

function SectionTitle({ children }) {
  const theme = useTheme();
  return (
    <Typography
      variant="overline"
      sx={{
        color: theme.palette.goldAccent.text,
        fontWeight: 700,
        letterSpacing: "0.12em",
        fontSize: "0.65rem",
        display: "block",
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

const EMPTY_JOB = {
  karigarId: "",
  billId: "",
  billItemId: "",
  itemName: "",
  itemCode: "",
  itemQuantity: 1,
  quantity: 1,
  metalType: "",
  assetClass: "GOLD",
  workType: "Casting",
  estimatedMetalRequired: "",
  goldPurity: "",
  grossWages: "",
  advancePayment: "",
};

export default function Karigar() {
  const theme = useTheme();
  const { goldRate = 7500 } = useSelector((state) => state.ui || {});

  const { data: jobs = [], isLoading: isJobsLoading } = useGetKarigarJobsQuery(
    undefined,
    { refetchOnMountOrArgChange: true },
  );
  const { data: karigarOptions = [] } = useGetFullTimeKarigarsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const activeKarigarOptions = karigarOptions.filter(
    (k) => k.isActive !== false,
  );
  const { data: purities = [] } = useGetKarigarLedgerPuritiesQuery();

  const [triggerGetBill, { isFetching: isSearchingBill }] =
    useLazyGetBillByIdQuery();
  const [assignJob, { isLoading: isAssigning }] = useAssignKarigarJobMutation();
  const [receiveJob, { isLoading: isReceiving }] =
    useReceiveKarigarJobMutation();

  const [assignOpen, setAssignOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const [searchBillId, setSearchBillId] = useState("");
  const [fetchedBill, setFetchedBill] = useState(null);
  const [billSearchError, setBillSearchError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [receiveError, setReceiveError] = useState("");

  const [newJob, setNewJob] = useState(EMPTY_JOB);
  const [receiveData, setReceiveData] = useState({
    finishedWeight: "",
    scrapReturned: "",
  });

  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter((j) => j.status === "Assigned").length;
  const completedJobs = jobs.filter((j) => j.status === "Completed").length;

  // A bill item's quantity can be split across multiple job cards, so "how many units
  // are left to assign" depends on what's already been given out — computed client-side
  // from the jobs list already in cache, no extra API call needed.
  const assignedQtyByItem = jobs.reduce((map, j) => {
    if (j.billItemId != null) {
      map[j.billItemId] = (map[j.billItemId] || 0) + (j.quantity || 1);
    }
    return map;
  }, {});

  const puritiesForAssetClass = (assetClass) =>
    purities.filter((p) => p.assetClass === assetClass);

  const handleSearchBill = async () => {
    setBillSearchError("");
    setAssignError("");
    if (!searchBillId.trim()) return;
    try {
      const bill = await triggerGetBill(searchBillId.trim()).unwrap();
      setFetchedBill(bill);
      setNewJob((prev) => ({
        ...prev,
        billId: bill.id,
        billItemId: "",
        itemCode: "",
        itemName: "",
        itemQuantity: 1,
        quantity: 1,
        metalType: "",
        assetClass: "GOLD",
        goldPurity: "",
      }));
    } catch {
      setFetchedBill(null);
      setBillSearchError("No order found with this ID.");
    }
  };

  const handleSelectItem = (item) => {
    setAssignError("");
    const assetClass = assetClassForMetal(item.metalType);
    const defaultPurity = puritiesForAssetClass(assetClass)[0]?.key || "";
    const totalQuantity = item.quantity || 1;
    // Only the remaining (unassigned) quantity is offered for this next assignment —
    // whatever's already gone to other job cards is no longer up for grabs.
    const remainingQuantity = Math.max(
      0,
      totalQuantity - (assignedQtyByItem[item.id] || 0),
    );
    setNewJob((prev) => ({
      ...prev,
      billItemId: item.id,
      itemCode: item.code ?? "",
      itemName: item.name ?? "",
      itemQuantity: remainingQuantity,
      quantity: remainingQuantity,
      metalType: item.metalType || "",
      assetClass,
      goldPurity: defaultPurity,
    }));
  };

  const handleAssignOpen = () => {
    setSearchBillId("");
    setFetchedBill(null);
    setBillSearchError("");
    setAssignError("");
    setNewJob(EMPTY_JOB);
    setAssignOpen(true);
  };

  const handleAssignSubmit = async () => {
    try {
      setAssignError("");
      await assignJob({
        billItemId: Number(newJob.billItemId),
        karigarId: Number(newJob.karigarId),
        workType: newJob.workType,
        quantity: Number(newJob.quantity) || 1,
        estimatedMetalRequired: parseFloat(newJob.estimatedMetalRequired),
        goldPurity: newJob.goldPurity,
        expectedWastagePercent: WORK_TYPES[newJob.workType],
        grossWages: parseFloat(newJob.grossWages),
        advancePayment: newJob.advancePayment
          ? parseFloat(newJob.advancePayment)
          : 0,
      }).unwrap();
      setAssignOpen(false);
    } catch (err) {
      console.error("Failed to assign job:", err);
      setAssignError(
        err?.data?.message ||
          err?.data?.error ||
          "Failed to assign job. Please verify bill item selection and input values.",
      );
    }
  };

  const handleReceiveOpen = (job) => {
    setSelectedJob(job);
    setReceiveData({ finishedWeight: "", scrapReturned: "" });
    setReceiveError("");
    setReceiveOpen(true);
  };

  const handleReceiveSubmit = async () => {
    try {
      setReceiveError("");
      await receiveJob({
        id: selectedJob.id,
        finishedWeight: parseFloat(receiveData.finishedWeight),
        scrapReturned: parseFloat(receiveData.scrapReturned),
      }).unwrap();
      setReceiveOpen(false);
    } catch (err) {
      console.error("Failed to receive job:", err);
      setReceiveError(
        err?.data?.message ||
          err?.data?.error ||
          "Failed to log returned weights. Please verify the values entered.",
      );
    }
  };

  const handleViewDetails = (job) => {
    setSelectedJob(job);
    setDetailsOpen(true);
  };

  const calculateMetrics = (job) => {
    if (job.status !== "Completed") return null;
    const actualWastage =
      job.estimatedMetalRequired - job.finishedWeight - job.scrapReturned;
    const actualWastagePercent = (actualWastage / job.estimatedMetalRequired) * 100;
    const expectedWastage = (job.estimatedMetalRequired * job.expectedWastagePercent) / 100;
    const excessWastage = Math.max(0, actualWastage - expectedWastage);
    const excessWastageValue = excessWastage * goldRate;
    const netWagesPayable = Math.max(0, job.grossWages - excessWastageValue);
    const advance = job.advancePayment ?? 0;
    const balanceDue = Math.max(0, netWagesPayable - advance);
    return {
      actualWastage: actualWastage.toFixed(3),
      actualWastagePercent: actualWastagePercent.toFixed(2),
      expectedWastage: expectedWastage.toFixed(3),
      excessWastage: excessWastage.toFixed(3),
      excessWastageValue: excessWastageValue.toFixed(2),
      netWagesPayable: netWagesPayable.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
    };
  };

  const getRemainingForReceive = (job) => {
    const gross = job?.grossWages ?? 0;
    const advance = job?.advancePayment ?? 0;
    return Math.max(0, gross - advance).toFixed(2);
  };

  const dialogTitleSx = {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.goldAccent.main} 100%)`,
    color: theme.palette.primary.contrastText,
    py: 2.5,
    px: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        background: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            color="text.primary"
            sx={{ fontFamily: "Georgia, serif", letterSpacing: "-0.01em" }}
          >
            Karigar Jobs
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Assign work, track gold, and settle wages with precision.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleAssignOpen}
          startIcon={<Assignment />}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
            color: theme.palette.primary.contrastText,
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            fontWeight: 700,
            "&:hover": {
              background: `linear-gradient(135deg, ${theme.palette.goldAccent.main}, ${theme.palette.primary.main})`,
            },
          }}
        >
          Assign New Job
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Assignment />}
            label="Total Jobs"
            value={totalJobs}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<PendingActions />}
            label="In Progress"
            value={pendingJobs}
            accent={alpha(theme.palette.warning.main, 0.15)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<CheckCircle />}
            label="Completed"
            value={completedJobs}
            accent={alpha(theme.palette.success.main, 0.15)}
          />
        </Grid>
      </Grid>

      {/* Table (component 2) */}
      <KarigarJobsTable
        jobs={jobs}
        isLoading={isJobsLoading}
        onReceive={handleReceiveOpen}
        onSettle={handleViewDetails}
      />

      {/* Assign Job dialog (component 3) */}
      <AssignJobDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        searchBillId={searchBillId}
        setSearchBillId={setSearchBillId}
        onSearchBill={handleSearchBill}
        isSearchingBill={isSearchingBill}
        billSearchError={billSearchError}
        fetchedBill={fetchedBill}
        newJob={newJob}
        setNewJob={setNewJob}
        onSelectItem={handleSelectItem}
        assignedQtyByItem={assignedQtyByItem}
        activeKarigarOptions={activeKarigarOptions}
        workTypes={WORK_TYPES}
        puritiesForAssetClass={puritiesForAssetClass}
        onSubmit={handleAssignSubmit}
        isAssigning={isAssigning}
        assignError={assignError}
      />

      {/* ══════════════════════════════════════════════════
          RECEIVE PIECE DIALOG
      ══════════════════════════════════════════════════ */}
      <Dialog
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", maxWidth: 760 },
        }}
      >
        <Box sx={dialogTitleSx}>
          <Box>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ fontFamily: "Georgia, serif" }}
            >
              Log Returned Piece
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {selectedJob?.jobId} • {selectedJob?.karigarName}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setReceiveOpen(false)}
            sx={{ color: "inherit" }}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent
          sx={{ p: 3, background: theme.palette.background.default }}
        >
          <Grid container spacing={3}>
            {/* ───────────── LEFT COLUMN — job & payment summary ───────────── */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2} height="100%">
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.goldAccent.lightBg,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    GOLD ISSUED
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: theme.palette.goldAccent.text }}
                  >
                    {selectedJob?.estimatedMetalRequired?.toFixed(3)} g
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedJob?.goldPurity} • {selectedJob?.workType}
                  </Typography>
                </Paper>

                {(selectedJob?.advancePayment ?? 0) > 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: alpha(theme.palette.info.main, 0.07),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                      flex: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      display="block"
                      mb={1}
                    >
                      PAYMENT SUMMARY
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Gross Wages
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        ₹ {selectedJob?.grossWages?.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Advance Paid
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="info.main"
                      >
                        − ₹ {(selectedJob?.advancePayment ?? 0).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between">
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="text.primary"
                      >
                        Balance Remaining
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        color="warning.dark"
                      >
                        ₹ {getRemainingForReceive(selectedJob)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block", fontStyle: "italic" }}
                    >
                      Final balance will be recalculated after wastage
                      deduction.
                    </Typography>
                  </Paper>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px dashed ${theme.palette.divider}`,
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                    >
                      No advance was paid on this job.
                      <br />
                      Full wages will be settled after weighing.
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </Grid>

            {/* ───────────── RIGHT COLUMN — weights entry ───────────── */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  border: `1px solid ${theme.palette.divider}`,
                  background: theme.palette.background.paper,
                  height: "100%",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: theme.palette.goldAccent.text,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    fontSize: "0.68rem",
                    display: "block",
                    mb: 2,
                  }}
                >
                  Returned Weights
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Finished Piece Weight (g)"
                    value={receiveData.finishedWeight}
                    onChange={(e) =>
                      setReceiveData({
                        ...receiveData,
                        finishedWeight: e.target.value,
                      })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Scrap Returned (g)"
                    value={receiveData.scrapReturned}
                    onChange={(e) =>
                      setReceiveData({
                        ...receiveData,
                        scrapReturned: e.target.value,
                      })
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />

                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background:
                        receiveData.finishedWeight && receiveData.scrapReturned
                          ? alpha(theme.palette.error.main, 0.07)
                          : alpha(theme.palette.grey[500], 0.06),
                      border: `1px solid ${
                        receiveData.finishedWeight && receiveData.scrapReturned
                          ? alpha(theme.palette.error.main, 0.25)
                          : theme.palette.divider
                      }`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      ESTIMATED WASTAGE
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      color={
                        receiveData.finishedWeight && receiveData.scrapReturned
                          ? "error.main"
                          : "text.secondary"
                      }
                    >
                      {receiveData.finishedWeight && receiveData.scrapReturned
                        ? `${(
                            (selectedJob?.estimatedMetalRequired ?? 0) -
                            parseFloat(receiveData.finishedWeight || 0) -
                            parseFloat(receiveData.scrapReturned || 0)
                          ).toFixed(3)} g`
                        : "Enter both weights to calculate"}
                    </Typography>
                  </Box>

                  {receiveError && (
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: alpha(theme.palette.error.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="error.main"
                        fontWeight={600}
                      >
                        {receiveError}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            background: theme.palette.background.paper,
            borderTop: `1px solid ${theme.palette.divider}`,
            gap: 1.5,
          }}
        >
          <Button
            onClick={() => setReceiveOpen(false)}
            disabled={isReceiving}
            sx={{ borderRadius: 2, color: "text.secondary", px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReceiveSubmit}
            disabled={
              !receiveData.finishedWeight ||
              !receiveData.scrapReturned ||
              isReceiving
            }
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
              color: theme.palette.primary.contrastText,
            }}
          >
            {isReceiving ? (
              <CircularProgress size={16} sx={{ color: "inherit" }} />
            ) : (
              "Log Weights"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════
          SETTLEMENT DIALOG
      ══════════════════════════════════════════════════ */}
      {selectedJob && selectedJob.status === "Completed" && (
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
        >
          <Box sx={dialogTitleSx}>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ fontFamily: "Georgia, serif" }}
              >
                Job Settlement
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {selectedJob.jobId} • {selectedJob.karigarName}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setDetailsOpen(false)}
              sx={{ color: "inherit" }}
            >
              <Close />
            </IconButton>
          </Box>

          <DialogContent
            sx={{ p: 3, background: theme.palette.background.default }}
          >
            {(() => {
              const m = calculateMetrics(selectedJob);
              const isOver =
                parseFloat(m.actualWastagePercent) >
                selectedJob.expectedWastagePercent;
              const hasAdvance = (selectedJob.advancePayment ?? 0) > 0;

              return (
                <Box>
                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          background: theme.palette.background.paper,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                        >
                          ASSIGNED ON
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {selectedJob.dateIssued}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          background: theme.palette.background.paper,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                        >
                          RETURNED ON
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={700}
                          color="text.primary"
                        >
                          {selectedJob.dateReturned}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                      mb: 2,
                    }}
                  >
                    <SectionTitle>Material Log</SectionTitle>
                    <LabelValue
                      label="Gold Issued"
                      value={`${selectedJob.estimatedMetalRequired.toFixed(3)} g`}
                    />
                    <LabelValue
                      label="Finished Piece"
                      value={`${selectedJob.finishedWeight.toFixed(3)} g`}
                    />
                    <LabelValue
                      label="Scrap Returned"
                      value={`${selectedJob.scrapReturned.toFixed(3)} g`}
                    />
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      mb: 2,
                      border: `1px solid ${theme.palette.divider}`,
                      background: alpha(theme.palette.grey[500], 0.06),
                    }}
                  >
                    <SectionTitle>Wastage Analysis</SectionTitle>
                    <LabelValue
                      label={`Expected (${selectedJob.expectedWastagePercent}%)`}
                      value={`${m.expectedWastage} g`}
                    />
                    <LabelValue
                      label={`Actual (${m.actualWastagePercent}%)`}
                      value={`${m.actualWastage} g`}
                      valueColor={
                        isOver
                          ? theme.palette.error.main
                          : theme.palette.success.dark
                      }
                    />
                    <Divider sx={{ my: 1 }} />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {isOver ? (
                          <TrendingUp
                            sx={{
                              color: theme.palette.error.main,
                              fontSize: 16,
                            }}
                          />
                        ) : (
                          <TrendingDown
                            sx={{
                              color: theme.palette.success.dark,
                              fontSize: 16,
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={isOver ? "error.main" : "success.dark"}
                        >
                          {isOver ? "Excess Wastage" : "Within Limit ✓"}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color={isOver ? "error.main" : "success.dark"}
                      >
                        {m.excessWastage} g
                      </Typography>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: `1px solid ${theme.palette.divider}`,
                      background: theme.palette.background.paper,
                    }}
                  >
                    <SectionTitle>
                      Final Settlement • Gold Rate ₹{goldRate}/g
                    </SectionTitle>
                    <LabelValue
                      label="Gross Wages"
                      value={`₹ ${selectedJob.grossWages.toFixed(2)}`}
                    />
                    <LabelValue
                      label="Wastage Deduction"
                      value={`− ₹ ${m.excessWastageValue}`}
                      valueColor={
                        parseFloat(m.excessWastageValue) > 0
                          ? theme.palette.error.main
                          : "text.secondary"
                      }
                    />
                    <LabelValue
                      label="Net Wages Payable"
                      value={`₹ ${m.netWagesPayable}`}
                    />

                    {hasAdvance && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <SectionTitle>Advance & Balance</SectionTitle>
                        <LabelValue
                          label="Advance Already Paid"
                          value={`− ₹ ${(selectedJob.advancePayment ?? 0).toFixed(2)}`}
                          valueColor={theme.palette.info.main}
                        />
                      </>
                    )}

                    <Divider sx={{ my: 1.5 }} />
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: theme.palette.goldAccent.lightBg,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Payments
                          sx={{ color: theme.palette.goldAccent.text }}
                        />
                        <Typography
                          variant="subtitle1"
                          fontWeight={800}
                          color="text.primary"
                        >
                          {hasAdvance ? "Balance Due" : "Net Payable"}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h5"
                        fontWeight={900}
                        sx={{ color: theme.palette.goldAccent.text }}
                      >
                        ₹ {hasAdvance ? m.balanceDue : m.netWagesPayable}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              );
            })()}
          </DialogContent>

          <DialogActions
            sx={{
              px: 3,
              py: 2.5,
              background: theme.palette.background.paper,
              borderTop: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Button
              onClick={() => setDetailsOpen(false)}
              variant="contained"
              sx={{
                borderRadius: 2,
                px: 4,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
                color: theme.palette.primary.contrastText,
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
