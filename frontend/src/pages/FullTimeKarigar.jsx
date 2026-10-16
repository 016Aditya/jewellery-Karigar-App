import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Grid,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  Stack,
  Paper,
  Tooltip,
  Skeleton,
  Fade,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  Person,
  Add,
  Edit,
  Delete,
  Phone,
  Badge,
  Work,
  AccountBalanceWallet,
  Close,
  Warning,
  CheckCircle,
  RadioButtonUnchecked as PendingIcon,
  ErrorOutline as ErrorIcon,
  TaskAlt as TaskAltIcon,
  Event,
  Home,
  Category,
  InfoOutlined,
} from "@mui/icons-material";
import {
  useGetFullTimeKarigarsQuery,
  useCreateFullTimeKarigarMutation,
  useUpdateFullTimeKarigarMutation,
  useDeleteFullTimeKarigarMutation,
} from "../features/api/apiSlice";

const STATUS_OPTIONS = ["Active", "Inactive", "On Leave"];

const KARIGAR_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "CONTRACT_BASED", label: "Contract Based" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "All Karigars" },
  ...KARIGAR_TYPES,
];

const formatKarigarType = (type) =>
  KARIGAR_TYPES.find((t) => t.value === type)?.label || "Full Time";

const EMPTY_FORM = {
  name: "",
  contactNumber: "",
  karigarType: "FULL_TIME",
  //   skill: "Plain Casting",
  status: "Active",
  monthlySalary: "",
  //   advanceBalance: "",
  joiningDate: "",
  address: "",
};

// Steps for the "vibe coding" progress modal — same pattern as DomesticBill.jsx's
// submission modal. The first two steps are timer-driven purely for visual feedback;
// the last one is tied to the real network call and stays active until it resolves.
const buildSaveSteps = (isEdit) => [
  {
    key: "validating",
    label: isEdit ? "Validating changes" : "Validating karigar details",
  },
  {
    key: "saving",
    label: isEdit ? "Updating karigar record" : "Creating karigar record",
  },
  { key: "finalizing", label: "Saving to database" },
];

const DELETE_STEPS = [
  { key: "checking", label: "Checking linked job history" },
  { key: "removing", label: "Removing karigar record" },
  { key: "finalizing", label: "Finalizing" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function StatusChip({ status }) {
  const theme = useTheme();
  const config = {
    Active: {
      bg: alpha(theme.palette.success.main, 0.12),
      color: theme.palette.success.dark,
      border: alpha(theme.palette.success.main, 0.3),
    },
    Inactive: {
      bg: alpha(theme.palette.error.main, 0.1),
      color: theme.palette.error.dark,
      border: alpha(theme.palette.error.main, 0.3),
    },
    "On Leave": {
      bg: alpha(theme.palette.warning.main, 0.12),
      color: theme.palette.warning.dark,
      border: alpha(theme.palette.warning.main, 0.3),
    },
  };
  const s = config[status] || config.Inactive;
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        background: s.bg,
        color: s.color,
        fontWeight: 900,
        border: `1px solid ${s.border}`,
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FullTimeKarigars() {
  const theme = useTheme();

  const { data: karigars = [], isLoading } = useGetFullTimeKarigarsQuery(
    undefined,
    {
      refetchOnMountOrArgChange: true,
    },
  );
  const [createKarigar, { isLoading: isCreating }] =
    useCreateFullTimeKarigarMutation();
  const [updateKarigar, { isLoading: isUpdating }] =
    useUpdateFullTimeKarigarMutation();
  const [deleteKarigar, { isLoading: isDeleting }] =
    useDeleteFullTimeKarigarMutation();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Table filter — All / Full Time / Contract Based
  const [typeFilter, setTypeFilter] = useState("ALL");

  // ── Vibe-coding progress modal state (shared by save + delete) ──
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressMode, setProgressMode] = useState("save"); // save | delete
  const [progressStatus, setProgressStatus] = useState("running"); // running | success | error
  const [progressStepIndex, setProgressStepIndex] = useState(0);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const progressSteps =
    progressMode === "delete"
      ? DELETE_STEPS
      : buildSaveSteps(Boolean(editTarget));

  // ── Derived stats & filtering ──
  const totalKarigars = karigars.length;
  const activeKarigars = karigars.filter((k) => k.status === "Active").length;
  const totalSalaryBill = karigars
    .filter((k) => k.status === "Active")
    .reduce((sum, k) => sum + (k.monthlySalary ?? 0), 0);

  const visibleKarigars =
    typeFilter === "ALL"
      ? karigars
      : karigars.filter((k) => (k.karigarType || "FULL_TIME") === typeFilter);

  // ── Handlers ──

  const handleOpenCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleOpenEdit = (karigar) => {
    setEditTarget(karigar);
    setForm({
      name: karigar.name ?? "",
      contactNumber: karigar.contactNumber ?? "",
      karigarType: karigar.karigarType ?? "FULL_TIME",
      skill: karigar.skill ?? "Plain Casting",
      status: karigar.status ?? "Active",
      monthlySalary: karigar.monthlySalary?.toString() ?? "",
      advanceBalance: karigar.advanceBalance?.toString() ?? "",
      joiningDate: karigar.joiningDate ?? "",
      address: karigar.address ?? "",
    });
    setFormError("");
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleOpenDelete = (karigar) => {
    setDeleteTarget(karigar);
    setDeleteOpen(true);
  };

  // Every field is mandatory. Monthly salary is only required (and only sent as a
  // positive number) for full-time karigars — contract-based karigars always send 0.0
  // instead of null, since the monthly_salary column has a NOT NULL constraint.
  const validateForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.contactNumber.trim())
      errs.contactNumber = "Phone number is required";
    if (!form.joiningDate) errs.joiningDate = "Joining date is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (
      form.karigarType === "FULL_TIME" &&
      (!form.monthlySalary || parseFloat(form.monthlySalary) <= 0)
    ) {
      errs.monthlySalary = "Monthly salary is required for full-time karigars";
    }
    return errs;
  };

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key])
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // Drives the step-by-step modal for both Add and Edit — steps 0/1 are a timed visual,
  // step 2 ("finalizing") triggers the real create/update call.
  const runSaveSequence = () => {
    clearTimers();
    setFormError("");
    setProgressMode("save");
    setProgressStatus("running");
    setProgressStepIndex(0);
    setProgressOpen(true);

    const STEP_DELAY = 550;
    const payload = {
      name: form.name,
      contactNumber: form.contactNumber,
      karigarType: form.karigarType,
      skill: form.skill,
      status: form.status,
      // Contract-based karigars always send 0.0 (never null) — monthly_salary is NOT NULL.
      monthlySalary:
        form.karigarType === "FULL_TIME" ? parseFloat(form.monthlySalary) : 0.0,
      advanceBalance: form.advanceBalance ? parseFloat(form.advanceBalance) : 0,
      joiningDate: form.joiningDate || null,
      address: form.address,
    };

    const t1 = setTimeout(() => setProgressStepIndex(1), STEP_DELAY);
    const t2 = setTimeout(async () => {
      setProgressStepIndex(2);
      try {
        if (editTarget) {
          await updateKarigar({ id: editTarget.id, ...payload }).unwrap();
        } else {
          await createKarigar(payload).unwrap();
        }
        setProgressStatus("success");
      } catch (err) {
        console.error("Failed to save karigar:", err);
        setFormError(
          err?.data?.message ||
            err?.data?.error ||
            "Failed to save. Please check your inputs and try again.",
        );
        setProgressStatus("error");
      }
    }, STEP_DELAY * 2);

    timersRef.current = [t1, t2];
  };

  // Same pattern for delete.
  const runDeleteSequence = () => {
    clearTimers();
    setProgressMode("delete");
    setProgressStatus("running");
    setProgressStepIndex(0);
    setProgressOpen(true);

    const STEP_DELAY = 550;
    const t1 = setTimeout(() => setProgressStepIndex(1), STEP_DELAY);
    const t2 = setTimeout(async () => {
      setProgressStepIndex(2);
      try {
        await deleteKarigar(deleteTarget.id).unwrap();
        setProgressStatus("success");
      } catch (err) {
        console.error("Failed to delete karigar:", err);
        setProgressStatus("error");
      }
    }, STEP_DELAY * 2);

    timersRef.current = [t1, t2];
  };

  const handleFormSubmit = () => {
    const errs = validateForm();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    runSaveSequence();
  };

  const handleProgressOk = () => {
    setProgressOpen(false);
    setFormOpen(false);
    setDeleteOpen(false);
  };

  const handleProgressRetry = () => {
    if (progressMode === "delete") runDeleteSequence();
    else runSaveSequence();
  };

  const handleProgressCancel = () => {
    clearTimers();
    setProgressOpen(false);
  };

  const handleDeleteConfirm = () => runDeleteSequence();

  const isFormValid =
    form.name.trim() &&
    form.contactNumber.trim() &&
    form.joiningDate &&
    form.address.trim() &&
    (form.karigarType !== "FULL_TIME" ||
      (form.monthlySalary && parseFloat(form.monthlySalary) > 0));
  const isSaving = isCreating || isUpdating;

  const dialogTitleSx = {
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.goldAccent.main} 100%)`,
    color: theme.palette.primary.contrastText,
    py: 2.5,
    px: 3,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  // ── Render ──

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
            Full-Time Karigars
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Manage your permanent artisan workforce — salaries, skills, and
            status.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleOpenCreate}
          startIcon={<Add />}
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
          Add Karigar
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Person />}
            label="Total Karigars"
            value={totalKarigars}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<Work />}
            label="Currently Active"
            value={activeKarigars}
            accent={alpha(theme.palette.success.main, 0.15)}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            icon={<AccountBalanceWallet />}
            label="Monthly Salary Bill"
            value={`₹ ${totalSalaryBill.toLocaleString("en-IN")}`}
            accent={alpha(theme.palette.info.main, 0.15)}
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            background: theme.palette.background.paper,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            All Karigars
          </Typography>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              {TYPE_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ background: theme.palette.goldAccent.lightBg }}>
                {[
                  "ID",
                  "Karigar",
                  "Type",
                  "Contact Number",
                  "Salary / Month",
                  "Actions",
                ].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      color: theme.palette.goldAccent.text,
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      py: 1.5,
                      borderBottom: `2px solid ${theme.palette.divider}`,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton width={40} height={20} sx={{ mb: 0.5 }} />
                      <Skeleton width={70} height={14} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Skeleton variant="circular" width={32} height={32} />
                        <Skeleton width={100} height={20} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Skeleton variant="rounded" width={90} height={22} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={100} height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={80} height={20} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" gap={1} justifyContent="center">
                        <Skeleton variant="rounded" width={30} height={30} />
                        <Skeleton variant="rounded" width={30} height={30} />
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : visibleKarigars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Person
                      sx={{ fontSize: 40, color: theme.palette.divider, mb: 1 }}
                    />
                    <Typography color="text.secondary">
                      No karigars added yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleKarigars.map((karigar) => (
                  <TableRow
                    key={karigar.id}
                    hover
                    sx={{
                      "&:hover": {
                        background: alpha(theme.palette.goldAccent.main, 0.06),
                      },
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {/* ID */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: theme.palette.goldAccent.text }}
                      >
                        #{karigar.id}
                      </Typography>
                      {karigar.joiningDate && (
                        <Typography variant="caption" color="text.secondary">
                          Joined {karigar.joiningDate}
                        </Typography>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            background: theme.palette.goldAccent.lightBg,
                            color: theme.palette.goldAccent.text,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                          }}
                        >
                          {karigar.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color="text.primary"
                        >
                          {karigar.name}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Chip
                        label={formatKarigarType(karigar.karigarType)}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          background:
                            karigar.karigarType === "CONTRACT_BASED"
                              ? alpha(theme.palette.info.main, 0.12)
                              : theme.palette.goldAccent.lightBg,
                          color:
                            karigar.karigarType === "CONTRACT_BASED"
                              ? theme.palette.info.dark
                              : theme.palette.goldAccent.text,
                        }}
                      />
                    </TableCell>

                    {/* contactNumber */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {karigar.contactNumber || "—"}
                      </Typography>
                    </TableCell>

                    {/* Salary */}
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                      >
                        {karigar.monthlySalary != null
                          ? `₹ ${karigar.monthlySalary.toLocaleString("en-IN")}`
                          : "—"}
                      </Typography>
                    </TableCell>

                    {/* Actions */}
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        gap={1}
                        justifyContent="flex-center"
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(karigar)}
                            sx={{
                              border: `1.5px solid ${theme.palette.primary.main}`,
                              color: theme.palette.primary.main,
                              borderRadius: 1.5,
                              "&:hover": {
                                background: theme.palette.goldAccent.lightBg,
                              },
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDelete(karigar)}
                            sx={{
                              border: `1.5px solid ${theme.palette.error.main}`,
                              color: theme.palette.error.main,
                              borderRadius: 1.5,
                              "&:hover": {
                                background: alpha(
                                  theme.palette.error.main,
                                  0.08,
                                ),
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ══════════════════════════════════════════════════
          CREATE / EDIT DIALOG
      ══════════════════════════════════════════════════ */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <Box sx={dialogTitleSx}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.18)",
                color: "inherit",
                fontWeight: 800,
              }}
            >
              {form.name?.[0]?.toUpperCase() || <Person />}
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ fontFamily: "Georgia, serif" }}
              >
                {editTarget ? "Edit Karigar" : "Add New Karigar"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {editTarget
                  ? `Updating details for ${editTarget.name}`
                  : "Register a new full-time or contract-based artisan"}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setFormOpen(false)}
            sx={{ color: "inherit" }}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent
          sx={{ p: 3, background: theme.palette.background.default }}
        >
          <Box
            display="flex"
            alignItems="center"
            gap={0.7}
            mb={2.5}
            color="text.secondary"
          >
            <InfoOutlined sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={600}>
              All fields marked with * are required.
            </Typography>
          </Box>

          {/* Employment Type — decides which fields matter below, so it comes first */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              mb: 3,
              background: theme.palette.background.paper,
            }}
          >
            <SectionTitle>Employment Type</SectionTitle>
            <FormControl fullWidth required>
              <InputLabel>Karigar Type</InputLabel>
              <Select
                label="Karigar Type *"
                value={form.karigarType}
                onChange={(e) =>
                  setForm({ ...form, karigarType: e.target.value })
                }
                startAdornment={
                  <InputAdornment position="start">
                    <Category sx={{ color: "text.secondary", fontSize: 18 }} />
                  </InputAdornment>
                }
                sx={{ borderRadius: 2 }}
              >
                {KARIGAR_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box
              sx={{
                mt: 1.5,
                p: 1.25,
                borderRadius: 2,
                background:
                  form.karigarType === "FULL_TIME"
                    ? theme.palette.goldAccent.lightBg
                    : alpha(theme.palette.info.main, 0.08),
                border: `1px solid ${
                  form.karigarType === "FULL_TIME"
                    ? theme.palette.goldAccent.border
                    : alpha(theme.palette.info.main, 0.25)
                }`,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {form.karigarType === "FULL_TIME"
                  ? "Full-time karigars are paid a fixed monthly salary."
                  : "Contract-based karigars have no fixed salary — they're paid per job via gross wages when assigned work."}
              </Typography>
            </Box>
          </Paper>

          {/* Personal Info */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              mb: 3,
              background: theme.palette.background.paper,
            }}
          >
            <SectionTitle>Personal Information</SectionTitle>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Full Name"
                  value={form.name}
                  onChange={setField("name")}
                  error={Boolean(fieldErrors.name)}
                  helperText={fieldErrors.name}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Badge sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Phone Number"
                  value={form.contactNumber}
                  onChange={setField("contactNumber")}
                  error={Boolean(fieldErrors.contactNumber)}
                  helperText={fieldErrors.contactNumber}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Joining Date"
                  type="date"
                  value={form.joiningDate}
                  onChange={setField("joiningDate")}
                  error={Boolean(fieldErrors.joiningDate)}
                  helperText={fieldErrors.joiningDate}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Event sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Address"
                  value={form.address}
                  onChange={setField("address")}
                  error={Boolean(fieldErrors.address)}
                  helperText={fieldErrors.address}
                  multiline
                  rows={1}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment
                        position="start"
                        sx={{ alignSelf: "flex-start", mt: 0 }}
                      >
                        <Home sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Compensation */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              background: theme.palette.background.paper,
            }}
          >
            <SectionTitle>Compensation</SectionTitle>
            {form.karigarType === "FULL_TIME" ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    type="number"
                    label="Monthly Salary (₹)"
                    value={form.monthlySalary}
                    onChange={setField("monthlySalary")}
                    error={Boolean(fieldErrors.monthlySalary)}
                    helperText={fieldErrors.monthlySalary}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">₹</InputAdornment>
                      ),
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            ) : (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: alpha(theme.palette.grey[500], 0.08),
                  border: `1px solid ${theme.palette.divider}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <AccountBalanceWallet
                  sx={{ color: "text.secondary", fontSize: 18 }}
                />
                <Typography variant="caption" color="text.secondary">
                  No fixed salary — wages are set per job in Karigar Management.
                </Typography>
              </Box>
            )}

            {/* Salary preview */}
            {form.monthlySalary &&
              form.advanceBalance &&
              parseFloat(form.advanceBalance) > 0 && (
                <Box
                  sx={{
                    mt: 2,
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
                    Net payable this month (after advance)
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    color="info.main"
                  >
                    ₹{" "}
                    {Math.max(
                      0,
                      parseFloat(form.monthlySalary || 0) -
                        parseFloat(form.advanceBalance || 0),
                    ).toFixed(2)}
                  </Typography>
                </Box>
              )}
          </Paper>

          {/* Error */}
          {formError && (
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 2,
                background: alpha(theme.palette.error.main, 0.08),
                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
              }}
            >
              <Typography variant="body2" color="error.main" fontWeight={600}>
                {formError}
              </Typography>
            </Box>
          )}
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
            onClick={() => setFormOpen(false)}
            disabled={isSaving}
            sx={{ borderRadius: 2, color: "text.secondary", px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={!isFormValid || isSaving}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
              color: theme.palette.primary.contrastText,
            }}
          >
            {isSaving ? (
              <CircularProgress size={16} sx={{ color: "inherit" }} />
            ) : editTarget ? (
              "Save Changes"
            ) : (
              "Add Karigar"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════
          DELETE CONFIRM DIALOG
      ══════════════════════════════════════════════════ */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
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
              Remove Karigar
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              This action cannot be undone
            </Typography>
          </Box>
          <IconButton
            onClick={() => setDeleteOpen(false)}
            sx={{ color: "inherit" }}
          >
            <Close />
          </IconButton>
        </Box>

        <DialogContent
          sx={{ p: 3, background: theme.palette.background.default }}
        >
          {/* Karigar summary */}
          {deleteTarget && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                background: theme.palette.background.paper,
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  background: theme.palette.goldAccent.lightBg,
                  color: theme.palette.goldAccent.text,
                  fontWeight: 800,
                  fontSize: "1.1rem",
                }}
              >
                {deleteTarget.name?.[0]?.toUpperCase()}
              </Avatar>
              <Box>
                <Typography
                  variant="body1"
                  fontWeight={700}
                  color="text.primary"
                >
                  {deleteTarget.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {deleteTarget.skill} • {deleteTarget.contactNumber}
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Warning */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: alpha(theme.palette.error.main, 0.08),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
              display: "flex",
              gap: 1.5,
              alignItems: "flex-start",
            }}
          >
            <Warning
              sx={{ color: theme.palette.error.main, fontSize: 20, mt: 0.1 }}
            />
            <Typography variant="body2" color="error.main" fontWeight={500}>
              Deleting this karigar will permanently remove all their records.
              Any linked jobs or payment history may be affected.
            </Typography>
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
            onClick={() => setDeleteOpen(false)}
            disabled={isDeleting}
            sx={{ borderRadius: 2, color: "text.secondary", px: 3 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.error.dark}, ${theme.palette.error.main})`,
              color: "#fff",
              "&:hover": {
                background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
              },
            }}
          >
            {isDeleting ? (
              <CircularProgress size={16} sx={{ color: "inherit" }} />
            ) : (
              "Yes, Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════════════════════════════════════
          VIBE-CODING PROGRESS MODAL — same pattern as DomesticBill.jsx's
          submission modal, reused here for Add / Edit / Delete.
      ══════════════════════════════════════════════════ */}
      <Dialog
        open={progressOpen}
        onClose={() => {}}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogContent sx={{ p: 4 }}>
          {progressStatus === "error" ? (
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
          ) : progressStatus === "success" ? (
            <Fade in>
              <Box textAlign="center" py={2}>
                <TaskAltIcon
                  sx={{ fontSize: 56, color: "success.main", mb: 1.5 }}
                />
                <Typography variant="h6" fontWeight={800} mb={0.5}>
                  {progressMode === "delete"
                    ? "Karigar Removed"
                    : "Karigar Saved"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressMode === "delete"
                    ? "The karigar record has been deleted."
                    : "The karigar record has been saved successfully."}
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
                {progressMode === "delete"
                  ? "Removing Karigar"
                  : "Saving Karigar"}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                {progressSteps.map((step, idx) => {
                  const isDone = idx < progressStepIndex;
                  const isActive = idx === progressStepIndex;
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
                        <CheckCircle
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
        {progressStatus !== "running" && (
          <DialogActions sx={{ px: 4, pb: 3, pt: 0 }}>
            {progressStatus === "error" ? (
              <>
                <Button onClick={handleProgressCancel} color="inherit">
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleProgressRetry}>
                  Try Again
                </Button>
              </>
            ) : (
              <Button fullWidth variant="contained" onClick={handleProgressOk}>
                OK
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
