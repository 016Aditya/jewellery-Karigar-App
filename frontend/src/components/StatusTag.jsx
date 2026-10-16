import { Chip } from "@mui/material";

const statusColors = {
  Design: "info",
  Manufacturing: "warning",
  "Stone Setting": "secondary",
  Polishing: "info",
  "Quality Check": "warning",
  Ready: "success",
  Dispatched: "default",
  Paid: "success",
  Pending: "warning",
};

export default function StatusTag({ status, size = "small" }) {
  return (
    <Chip
      label={status}
      size={size}
      color={statusColors[status] || "default"}
      variant="outlined"
      sx={{ fontWeight: 600, borderRadius: 1 }}
    />
  );
}
