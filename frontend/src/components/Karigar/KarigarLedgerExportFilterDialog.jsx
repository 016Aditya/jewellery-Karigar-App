import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DateRange as DateRangeIcon, FileDownload } from "@mui/icons-material";

const QUICK_RANGES = [
  { label: "Last 1M", months: 1 },
  { label: "Last 3M", months: 3 },
  { label: "Last 6M", months: 6 },
  { label: "Last 1Y", months: 12 },
];

export default function KarigarLedgerExportFilterDialog({
  open,
  onClose,
  activeMetalLabel,
  exportRange,
  setExportRange,
  exportRangeError,
  onApplyQuickRange,
  onConfirm,
}) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.goldAccent.main} 100%)`,
          color: theme.palette.primary.contrastText,
          py: 2.5,
          px: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <DateRangeIcon />
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ fontFamily: "Georgia, serif" }}>
            Export Ledger to Excel
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Choose the date range to include in the {activeMetalLabel} transaction log
          </Typography>
        </Box>
      </Box>
      <DialogContent sx={{ p: 3 }}>
        <Box display="flex" gap={1} mb={2.5} flexWrap="wrap">
          {QUICK_RANGES.map((q) => (
            <Chip
              key={q.label}
              label={q.label}
              onClick={() => onApplyQuickRange(q.months)}
              sx={{ fontWeight: 700, cursor: "pointer" }}
              variant="outlined"
            />
          ))}
        </Box>
        <Box display="flex" gap={2}>
          <TextField
            fullWidth
            type="date"
            label="Start Date"
            value={exportRange.start}
            onChange={(e) => setExportRange((r) => ({ ...r, start: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            type="date"
            label="End Date"
            value={exportRange.end}
            onChange={(e) => setExportRange((r) => ({ ...r, end: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Box>
        {exportRangeError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {exportRangeError}
          </Alert>
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
        <Button onClick={onClose} sx={{ borderRadius: 2, color: "text.secondary", px: 3 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          startIcon={<FileDownload />}
          sx={{
            borderRadius: 2,
            px: 3,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
            color: theme.palette.primary.contrastText,
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
