import { Box, Card, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { getMetalColor } from "../../utils/metalColors";
import { f4 } from "./karigarLedgerUtils";

export default function KarigarMetalCard({ metal, active, balance, onClick }) {
  const theme = useTheme();
  const color = getMetalColor(metal.value);
  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        flex: "1 1 0",
        minWidth: 200,
        p: 2.5,
        textAlign: "center",
        cursor: "pointer",
        border: "2px solid",
        borderColor: active ? color : theme.palette.divider,
        bgcolor: active ? `${color}14` : theme.palette.background.paper,
        transition: "all 0.2s ease",
        "&:hover": { borderColor: color },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
        <Typography fontWeight={800} fontSize={15} color={active ? color : "text.primary"}>
          {metal.label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ color: active ? color : "text.primary" }}>
        {f4(balance)}g
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Current Fine Balance
      </Typography>
    </Card>
  );
}
