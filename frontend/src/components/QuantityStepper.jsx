import { Box, Typography, IconButton } from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";

export default function QuantityStepper({ value, onIncrease, onDecrease }) {
  return (
    <Box
      display="flex"
      alignItems="center"
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden",
        width: "fit-content",
        mx: "auto",
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrease}
        disabled={value <= 1}
        sx={{
          borderRadius: 0,
          width: 28,
          height: 28,
          "&:disabled": { opacity: 0.3 },
        }}
      >
        <RemoveIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{
          minWidth: 28,
          textAlign: "center",
          fontSize: 13,
          userSelect: "none",
          px: 0.5,
        }}
      >
        {value}
      </Typography>
      <IconButton
        size="small"
        onClick={onIncrease}
        sx={{ borderRadius: 0, width: 28, height: 28 }}
      >
        <AddIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}
