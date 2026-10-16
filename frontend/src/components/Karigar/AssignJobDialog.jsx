import React from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
  Stack,
  Paper,
  Chip,
  MenuItem,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  Search,
  CheckCircle,
  Close,
  AccountBalanceWallet,
  Add,
  Remove,
  Diamond,
  Engineering,
} from "@mui/icons-material";

const formatKarigarType = (type) =>
  type === "CONTRACT_BASED" ? "Contract Based" : "Full Time";

function SectionTitle({ children, step }) {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" gap={1} mb={2}>
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.68rem",
          fontWeight: 800,
          color: theme.palette.primary.contrastText,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
          flexShrink: 0,
        }}
      >
        {step}
      </Box>
      <Typography
        variant="overline"
        sx={{
          color: theme.palette.text.primary,
          fontWeight: 800,
          letterSpacing: "0.08em",
          fontSize: "0.72rem",
        }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

// Quantity stepper — lets the user issue the job for the full item quantity or
// split it down to a partial batch (e.g. 2 of 5 rings going to this karigar).
function QuantityStepper({ value, max, onChange }) {
  const theme = useTheme();
  const dec = () => onChange(Math.max(1, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <Stack direction="row" alignItems="center" spacing={0}>
      <IconButton
        size="small"
        onClick={dec}
        disabled={value <= 1}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "8px 0 0 8px",
          borderRight: "none",
        }}
      >
        <Remove fontSize="small" />
      </IconButton>
      <Box
        sx={{
          minWidth: 44,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${theme.palette.divider}`,
          fontWeight: 700,
          fontSize: "0.9rem",
        }}
      >
        {value}
      </Box>
      <IconButton
        size="small"
        onClick={inc}
        disabled={value >= max}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "0 8px 8px 0",
          borderLeft: "none",
        }}
      >
        <Add fontSize="small" />
      </IconButton>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
        of {max} available
      </Typography>
    </Stack>
  );
}

export default function AssignJobDialog({
  open,
  onClose,
  theme: themeProp,
  searchBillId = "",
  setSearchBillId,
  onSearchBill,
  isSearchingBill,
  billSearchError,
  fetchedBill,
  newJob,
  setNewJob,
  onSelectItem,
  assignedQtyByItem = {},
  activeKarigarOptions = [],
  workTypes = {},
  puritiesForAssetClass,
  onSubmit,
  isAssigning,
  assignError,
}) {
  const theme = useTheme();

  // Defensive fallback: if the parent hasn't initialized newJob yet (or a prop
  // name mismatch slips through), render with a safe empty shape instead of
  // crashing the whole dialog on `undefined.karigarId`.
  const job = newJob || {
    karigarId: "",
    billId: "",
    billItemId: "",
    itemName: "",
    itemCode: "",
    itemQuantity: 1,
    quantity: 1,
    metalType: "",
    assetClass: "GOLD",
    workType: "",
    estimatedMetalRequired: "",
    goldPurity: "",
    grossWages: "",
    advancePayment: "",
  };
  const getPurities =
    typeof puritiesForAssetClass === "function"
      ? puritiesForAssetClass
      : () => [];

  const jobQuantity = Number(job.quantity) || 1;
  const isGoldQtyInvalid =
    job.estimatedMetalRequired !== "" &&
    job.estimatedMetalRequired != null &&
    Number(job.estimatedMetalRequired) <= jobQuantity;

  const isAssignValid =
    job.karigarId &&
    job.billItemId &&
    job.estimatedMetalRequired &&
    job.grossWages &&
    !isGoldQtyInvalid;

  const selectedKarigar =
    activeKarigarOptions.find((k) => k.id === job.karigarId) || null;
  const selectedWorkType = job.workType || null;
  const maxQty = job.itemQuantity || 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          width: "100%",
          maxWidth: 1320,
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.goldAccent.main} 100%)`,
          color: theme.palette.primary.contrastText,
          py: 2.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ fontFamily: "Georgia, serif" }}
          >
            Assign Job to Karigar
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Look up the order, choose an item and quantity, and issue metal for
            work
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: "inherit" }}>
          <Close />
        </IconButton>
      </Box>

      <DialogContent
        sx={{ p: 3, background: theme.palette.background.default }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: { xs: "wrap", md: "nowrap" },
            gap: 3,
            width: "100%",
          }}
        >
          {/* ───────────── COLUMN 1 — order lookup + item selection ───────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
              <SectionTitle step={1}>Look Up Order</SectionTitle>
              <Box display="flex" gap={1.5} mb={2}>
                <TextField
                  size="small"
                  fullWidth
                  label="Enter Order ID"
                  value={searchBillId}
                  onChange={(e) => setSearchBillId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSearchBill()}
                  error={Boolean(billSearchError)}
                  helperText={billSearchError}
                  disabled={isSearchingBill}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
                <Button
                  variant="contained"
                  onClick={onSearchBill}
                  disabled={isSearchingBill || !searchBillId.trim()}
                  sx={{
                    minWidth: 48,
                    borderRadius: 2,
                    px: 2,
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
                    color: theme.palette.primary.contrastText,
                  }}
                >
                  {isSearchingBill ? (
                    <CircularProgress size={18} sx={{ color: "inherit" }} />
                  ) : (
                    <Search />
                  )}
                </Button>
              </Box>

              {fetchedBill && (
                <>
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      background: alpha(theme.palette.success.main, 0.1),
                      border: `1px solid ${alpha(theme.palette.success.main, 0.4)}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <CheckCircle
                      sx={{ color: theme.palette.success.dark, fontSize: 16 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: theme.palette.success.dark,
                        fontWeight: 700,
                      }}
                    >
                      Bill found: {fetchedBill.id} —{" "}
                      {fetchedBill.items?.length || 0} item(s) available
                    </Typography>
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    mb={1}
                    display="block"
                  >
                    SELECT ITEM FROM BILL
                  </Typography>
                  <Stack
                    spacing={1}
                    sx={{ maxHeight: 460, overflowY: "auto", pr: 0.5 }}
                  >
                    {(fetchedBill.items || []).map((item) => {
                      const isSelected =
                        String(job.billItemId) === String(item.id);
                      const totalQty = item.quantity || 1;
                      // A bill item's quantity can already be partially spoken for by
                      // other job cards — only the remainder is offered here, so the
                      // list always reflects what's actually still assignable.
                      const remainingQty = Math.max(
                        0,
                        totalQty - (assignedQtyByItem[item.id] || 0),
                      );
                      const isFullyAssigned = remainingQty <= 0;
                      return (
                        <Box
                          key={item.id}
                          onClick={() => !isFullyAssigned && onSelectItem(item)}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: `1.5px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
                            background: isSelected
                              ? theme.palette.goldAccent.lightBg
                              : isFullyAssigned
                                ? alpha(theme.palette.text.disabled, 0.06)
                                : theme.palette.background.default,
                            cursor: isFullyAssigned ? "not-allowed" : "pointer",
                            opacity: isFullyAssigned ? 0.6 : 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            transition: "all 0.15s ease",
                            "&:hover": isFullyAssigned
                              ? {}
                              : {
                                  borderColor: theme.palette.primary.main,
                                  background: alpha(
                                    theme.palette.goldAccent.main,
                                    0.08,
                                  ),
                                },
                          }}
                        >
                          <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                color="text.primary"
                              >
                                {item.name}
                              </Typography>
                              {item.metalType && (
                                <Chip
                                  label={item.metalType.replace("_", " ")}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                />
                              )}
                              {isFullyAssigned ? (
                                <Chip
                                  label="Fully Assigned"
                                  size="small"
                                  color="default"
                                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                                />
                              ) : remainingQty < totalQty ? (
                                <Chip
                                  label={`${remainingQty} of ${totalQty} left`}
                                  size="small"
                                  color="warning"
                                  sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                                />
                              ) : null}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ID: {item.id} • Code: {item.code}
                              {totalQty > 1 ? ` • Qty ${totalQty}` : ""}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ color: theme.palette.goldAccent.text }}
                            >
                              {item.weight ?? "-"} g
                            </Typography>
                            {isSelected && (
                              <CheckCircle
                                sx={{
                                  color: theme.palette.primary.main,
                                  fontSize: 18,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}

              {!fetchedBill && (
                <Box
                  sx={{
                    py: 5,
                    textAlign: "center",
                    color: "text.secondary",
                  }}
                >
                  <Diamond sx={{ fontSize: 32, opacity: 0.3, mb: 1 }} />
                  <Typography variant="body2">
                    Search an order to see its items here.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* ───────────── COLUMN 2 — assignment (item, quantity, karigar, work type) ───────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
              <SectionTitle step={2}>Assignment</SectionTitle>

              <Stack spacing={2}>
                {/* Selected item + quantity stepper */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: theme.palette.goldAccent.lightBg,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      SELECTED ITEM
                    </Typography>
                    {job.metalType && (
                      <Chip
                        label={job.metalType.replace("_", " ")}
                        size="small"
                        sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color="text.primary"
                  >
                    {job.itemName || "No item selected"}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mb={1.5}
                  >
                    {job.billItemId
                      ? `Order ${job.billId} • Item ${job.billItemId} • Code ${job.itemCode}`
                      : "Choose one item in Step 1"}
                  </Typography>

                  {job.billItemId && (
                    <>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        display="block"
                        mb={0.75}
                      >
                        QUANTITY FOR THIS JOB
                      </Typography>
                      <QuantityStepper
                        value={job.quantity || 1}
                        max={maxQty}
                        onChange={(q) => setNewJob({ ...job, quantity: q })}
                      />
                      {maxQty > 1 && (
                        <Stack direction="row" spacing={1} mt={1}>
                          <Chip
                            label="Full quantity"
                            size="small"
                            onClick={() =>
                              setNewJob({ ...job, quantity: maxQty })
                            }
                            color={
                              job.quantity === maxQty ? "primary" : "default"
                            }
                            variant={
                              job.quantity === maxQty ? "filled" : "outlined"
                            }
                          />
                          <Chip
                            label="Partial batch"
                            size="small"
                            onClick={() =>
                              setNewJob({
                                ...job,
                                quantity:
                                  Math.min(job.quantity || 1, maxQty - 1) || 1,
                              })
                            }
                            color={
                              job.quantity < maxQty ? "primary" : "default"
                            }
                            variant={
                              job.quantity < maxQty ? "filled" : "outlined"
                            }
                          />
                        </Stack>
                      )}
                    </>
                  )}
                </Paper>

                {/* Karigar — Autocomplete for fast search on long lists */}
                <Autocomplete
                  options={activeKarigarOptions}
                  value={selectedKarigar}
                  getOptionLabel={(k) => k?.name || ""}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  onChange={(_, val) =>
                    setNewJob({ ...job, karigarId: val ? val.id : "" })
                  }
                  noOptionsText="No active karigars — add one in Karigar Management"
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        width="100%"
                        gap={1}
                      >
                        <Typography noWrap>{option.name}</Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {formatKarigarType(option.karigarType)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Karigar"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Engineering
                              sx={{ color: "text.secondary", fontSize: 18 }}
                            />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  )}
                />

                {/* Work Type — Autocomplete showing std. wastage inline */}
                <Autocomplete
                  options={Object.keys(workTypes)}
                  value={selectedWorkType}
                  disableClearable
                  onChange={(_, val) => setNewJob({ ...job, workType: val })}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        width="100%"
                        gap={1}
                      >
                        <Typography noWrap>{option}</Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {workTypes[option]}% std. waste
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Work Type"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  )}
                />
              </Stack>
            </Paper>
          </Box>

          {/* ───────────── COLUMN 3 — financials ───────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
              <SectionTitle step={3}>Metal &amp; Wages</SectionTitle>

              <Stack spacing={2}>
                <Grid container spacing={1.5}>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Estimated Metal Required (g)"
                      placeholder="e.g. 12.4567"
                      inputProps={{ step: "0.0001", min: 0 }}
                      value={job.estimatedMetalRequired}
                      onChange={(e) =>
                        setNewJob({
                          ...job,
                          estimatedMetalRequired: e.target.value,
                        })
                      }
                      error={isGoldQtyInvalid}
                      helperText={
                        isGoldQtyInvalid
                          ? `Must be greater than quantity (${jobQuantity})`
                          : "Precise to 4 decimals (0.1mg)"
                      }
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      select
                      fullWidth
                      label="Purity"
                      value={job.goldPurity}
                      onChange={(e) =>
                        setNewJob({ ...job, goldPurity: e.target.value })
                      }
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                      disabled={!job.billItemId}
                      helperText={!job.billItemId ? "Select an item first" : ""}
                    >
                      {getPurities(job.assetClass).map((p) => (
                        <MenuItem key={p.key} value={p.key}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  type="number"
                  label="Gross Wages (₹)"
                  value={job.grossWages}
                  onChange={(e) =>
                    setNewJob({ ...job, grossWages: e.target.value })
                  }
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />

                <Divider>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                  >
                    ADVANCE PAYMENT
                  </Typography>
                </Divider>

                <TextField
                  fullWidth
                  type="number"
                  label="Advance Payment (₹)"
                  placeholder="0 — leave blank if none"
                  value={job.advancePayment}
                  onChange={(e) =>
                    setNewJob({ ...job, advancePayment: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountBalanceWallet
                          sx={{ color: "text.secondary", fontSize: 18 }}
                        />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />

                {job.grossWages && job.advancePayment && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: alpha(theme.palette.info.main, 0.07),
                      border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      Balance remaining after advance
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color="info.main"
                    >
                      ₹{" "}
                      {Math.max(
                        0,
                        parseFloat(job.grossWages || 0) -
                          parseFloat(job.advancePayment || 0),
                      ).toFixed(2)}
                    </Typography>
                  </Box>
                )}

                {assignError && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      background: alpha(theme.palette.error.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="error.main"
                      fontWeight={600}
                    >
                      {assignError}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Box>
        </Box>
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
          onClick={onClose}
          disabled={isAssigning}
          sx={{ borderRadius: 2, color: "text.secondary", px: 3 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!isAssignValid || isAssigning}
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
            color: theme.palette.primary.contrastText,
          }}
        >
          {isAssigning ? (
            <CircularProgress size={16} sx={{ color: "inherit" }} />
          ) : (
            "Assign Job"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
