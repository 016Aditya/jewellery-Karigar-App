import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// The "Add Gold Issued (OUT)" / "Add Gold Returned (IN)" entry form — rendered inline
// below the metal cards when the karigar ledger detail page's showForm state is true.
export default function KarigarLedgerEntryForm({
  formType,
  activeMetalLabel,
  form,
  setForm,
  catPurities,
  formError,
  isSaving,
  onCancel,
  onSubmit,
}) {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.background.paper,
      }}
    >
      <Typography
        variant="subtitle1"
        fontWeight={800}
        mb={2}
        color={formType === "ISSUE" ? "warning.main" : "success.main"}
      >
        {formType === "ISSUE"
          ? `${activeMetalLabel} Issued (OUT) Entry`
          : `${activeMetalLabel} Returned (IN) Entry`}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Date"
            value={new Date().toLocaleDateString("en-CA")}
            disabled
            helperText="Always today — set by the server"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            type="number"
            label="Gross Weight (g)"
            value={form.grossWeight}
            onChange={(e) => setForm((f) => ({ ...f, grossWeight: e.target.value }))}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth sx={{ minWidth: 220 }}>
            <InputLabel>Purity</InputLabel>
            <Select
              label="Purity"
              value={form.purity}
              onChange={(e) => setForm((f) => ({ ...f, purity: e.target.value }))}
              // Fixed minWidth on the popup menu too — otherwise it sizes itself off
              // whichever option happens to be selected, causing the trigger to
              // visibly shrink/grow as the value or the active metal changes.
              MenuProps={{ PaperProps: { sx: { minWidth: 220 } } }}
              sx={{ borderRadius: 2, minWidth: 220 }}
            >
              {catPurities.map((p) => (
                <MenuItem key={p.key} value={p.key}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Job Card (optional)"
            value={form.jobCard}
            onChange={(e) => setForm((f) => ({ ...f, jobCard: e.target.value }))}
            placeholder="e.g. JC-1042"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Why was this issued/returned?"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Grid>
      </Grid>
      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}
      <Box display="flex" gap={1.5} justifyContent="flex-end" mt={2}>
        <Button onClick={onCancel} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.goldAccent.main})`,
          }}
        >
          {isSaving ? "Saving..." : "Save Entry"}
        </Button>
      </Box>
    </Paper>
  );
}
