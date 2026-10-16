import { useMemo } from "react";
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Avatar,
  Stack,
  Paper,
  Skeleton,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Person, Scale, ChevronRight } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  useGetFullTimeKarigarsQuery,
  useGetKarigarLedgerAccountsQuery,
} from "../features/api/apiSlice";
import { getMetalColor } from "../utils/metalColors";

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
        <Typography variant="h6" fontWeight={700} color="text.primary" lineHeight={1}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

function HoldingCell({ value, assetClass }) {
  const color = getMetalColor(assetClass);
  const amount = Number(value) || 0;
  return (
    <Typography
      variant="body2"
      fontWeight={700}
      sx={{ color: amount > 0 ? color : "text.disabled" }}
    >
      {amount.toFixed(3)}g
    </Typography>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function KarigarLedger() {
  const theme = useTheme();
  const navigate = useNavigate();

  // Karigars come from the master FullTimeKarigar table (single source of truth for
  // every karigar), which already carries the denormalized total*Holding fields kept in
  // sync by the ledger service whenever an entry is added or deleted.
  const { data: karigars = [], isLoading: isLoadingKarigars } =
    useGetFullTimeKarigarsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: accounts = [], isLoading: isLoadingAccounts } =
    useGetKarigarLedgerAccountsQuery(undefined, { refetchOnMountOrArgChange: true });

  const isLoading = isLoadingKarigars || isLoadingAccounts;

  const totalsByAssetClass = useMemo(() => {
    const totals = { GOLD: 0, SILVER: 0, PLATINUM: 0 };
    accounts.forEach((a) =>
      a.holdings.forEach((h) => {
        totals[h.assetClass] = (totals[h.assetClass] || 0) + (Number(h.fineBalance) || 0);
      }),
    );
    return totals;
  }, [accounts]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: theme.palette.background.default, minHeight: "100vh" }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            color="text.primary"
            sx={{ fontFamily: "Georgia, serif", letterSpacing: "-0.01em" }}
          >
            Karigar Gold Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Track fine-metal issued to and returned by every karigar, by asset class.
          </Typography>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={3}>
          <StatCard icon={<Person />} label="Total Karigars" value={karigars.length} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <StatCard
            icon={<Scale />}
            label="Gold Held (Fine)"
            value={`${totalsByAssetClass.GOLD.toFixed(3)}g`}
            accent={`${getMetalColor("GOLD")}33`}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <StatCard
            icon={<Scale />}
            label="Silver Held (Fine)"
            value={`${totalsByAssetClass.SILVER.toFixed(3)}g`}
            accent={`${getMetalColor("SILVER")}33`}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <StatCard
            icon={<Scale />}
            label="Platinum Held (Fine)"
            value={`${totalsByAssetClass.PLATINUM.toFixed(3)}g`}
            accent={`${getMetalColor("PLATINUM")}33`}
          />
        </Grid>
      </Grid>

      {/* Table */}
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: "hidden" }}>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            background: theme.palette.background.paper,
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            All Karigar Holdings
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click a row to open its full transaction ledger
          </Typography>
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
                  "Gold Holding",
                  "Silver Holding",
                  "Platinum Holding",
                  "",
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
                      <Skeleton width={40} height={20} />
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
                      <Skeleton width={60} height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={60} height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={60} height={20} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={20} height={20} />
                    </TableCell>
                  </TableRow>
                ))
              ) : karigars.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Person sx={{ fontSize: 40, color: theme.palette.divider, mb: 1 }} />
                    <Typography color="text.secondary">No karigars added yet.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                karigars.map((karigar) => (
                  <TableRow
                    key={karigar.id}
                    hover
                    onClick={() => navigate(`/karigarLedger/${karigar.id}`)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { background: alpha(theme.palette.goldAccent.main, 0.06) },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        #{karigar.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.2}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 700 }}>
                          {karigar.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {karigar.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={karigar.karigarType === "CONTRACT_BASED" ? "Contract" : "Full Time"}
                        sx={{ fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {karigar.contactNumber || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <HoldingCell value={karigar.totalGoldHolding} assetClass="GOLD" />
                    </TableCell>
                    <TableCell>
                      <HoldingCell value={karigar.totalSilverHolding} assetClass="SILVER" />
                    </TableCell>
                    <TableCell>
                      <HoldingCell value={karigar.totalPlatinumHolding} assetClass="PLATINUM" />
                    </TableCell>
                    <TableCell>
                      <ChevronRight sx={{ color: "text.disabled" }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
