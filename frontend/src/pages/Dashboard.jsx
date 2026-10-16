import React from "react";
import { Box, Grid, Card, Typography, Button, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  useGetDashboardStatsQuery,
  useLazyGetDashboardStatsQuery,
  useRefreshChartCacheMutation,
} from "../features/api/apiSlice";
import DashboardStatCard from "../components/DashboardStatCard";
import LazyChartMount from "../components/charts/LazyChartMount";

// ── Chart components ───────────────────────────────────────────────────────
import TopSellingItemsChart from "../components/charts/TopSellingItemsChart";
import KarigarJobVolumeChart from "../components/charts/KarigarJobVolumeChart";
import MetalWeightChart from "../components/charts/MetalWeightChart";
import GhataTrendChart from "../components/charts/GhataTrendChart";
import TurnaroundTimeChart from "../components/charts/TurnaroundTimeChart";
import ProductivityRadarChart from "../components/charts/ProductivityRadarChart";
import WagePayoutChart from "../components/charts/WagePayoutChart";
import WagePerGramChart from "../components/charts/WagePerGramChart";
import WagesVsValueChart from "../components/charts/WagesVsValueChart";
import AdvanceBalanceLedgerChart from "../components/charts/AdvanceBalanceLedgerChart";
import WageTrendChart from "../components/charts/WageTrendChart";
// import Chart4 from "../components/charts/Chart4";
// ──────────────────────────────────────────────────────────────────────────

// ── Global chart height token — change here to resize ALL placeholders ─────
export const CHART_CARD_HEIGHT = 460;

export default function Dashboard() {
  const { data: baseStats, isLoading: sLoad } = useGetDashboardStatsQuery();
  const [triggerRefresh, { data: refreshedStats, isFetching: statsRefreshing }] =
    useLazyGetDashboardStatsQuery();
  const [refreshChartCache, { isLoading: chartsRefreshing }] = useRefreshChartCacheMutation();
  const stats = refreshedStats ?? baseStats;
  const refreshing = statsRefreshing || chartsRefreshing;
  const { rates = {} } = useSelector((state) => state.ui) || {};
  const goldRate = rates.GOLD?.rate || 0;

  const handleRefresh = () => {
    triggerRefresh(true);
    // Clears the backend's 24h chart cache first, then (via invalidatesTags) forces
    // every currently-mounted chart to refetch fresh data — mirrors the stats card.
    refreshChartCache();
  };

  const lastUpdatedLabel = stats?.lastUpdatedAt
    ? new Date(stats.lastUpdatedAt).toLocaleString()
    : null;

  const metrics = [
    {
      label: "Total Orders Till Date",
      value: stats?.totalOrders ?? 0,
      sub: "All orders ever placed",
      color: "primary.main",
      icon: ReceiptLongRoundedIcon,
    },
    {
      label: "Completed This Month",
      value: stats?.completedOrdersThisMonth ?? 0,
      sub: "Orders fully delivered",
      color: "success.main",
      icon: TaskAltRoundedIcon,
    },
    {
      label: "In Progress This Month",
      value: stats?.inProgressOrdersThisMonth ?? 0,
      sub: "Orders still in the pipeline",
      color: "warning.main",
      icon: PendingActionsRoundedIcon,
    },
    {
      label: "Active Karigar Tasks",
      value: stats?.activeKarigarTasks ?? 0,
      sub: "Currently assigned job cards",
      color: "secondary.main",
      icon: EngineeringRoundedIcon,
    },
    {
      label: "Salaried Karigars",
      value: stats?.salariedKarigars ?? 0,
      sub: "Active full-time staff",
      color: "info.main",
      icon: BadgeRoundedIcon,
    },
    {
      label: "Catalogue Variety",
      value: stats?.catalogueCount ?? 0,
      sub: "Distinct items in DB",
      color: "warning.light",
      icon: DiamondRoundedIcon,
    },
  ];

  return (
    <Box>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1.5}
        mb={4}
      >
        <Typography variant="h4">Dashboard</Typography>

        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="caption" color="text.secondary">
            {refreshing
              ? "Refreshing…"
              : lastUpdatedLabel
                ? `Last updated: ${lastUpdatedLabel}`
                : ""}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={
              refreshing ? <CircularProgress size={14} /> : <RefreshRoundedIcon fontSize="small" />
            }
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh Now
          </Button>
        </Box>
      </Box>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(6, 1fr)",
        }}
        gap={2.5}
        mb={4}
      >
        {metrics.map((m) => (
          <DashboardStatCard key={m.label} {...m} loading={sLoad} />
        ))}
      </Box>

      {/* ── Charts Grid — every chart takes the full row width, and only ───── */}
      {/* fetches its data once it scrolls near the viewport (see LazyChartMount) */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <TopSellingItemsChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <KarigarJobVolumeChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <MetalWeightChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <GhataTrendChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <TurnaroundTimeChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <WagePayoutChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <WagePerGramChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <WagesVsValueChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <AdvanceBalanceLedgerChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <WageTrendChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LazyChartMount cardHeight={CHART_CARD_HEIGHT}>
            <ProductivityRadarChart cardHeight={CHART_CARD_HEIGHT} />
          </LazyChartMount>
        </Grid>
      </Grid>
    </Box>
  );
}

// ── Placeholder — same height as real chart cards ─────────────────────────
function ChartPlaceholder({ label }) {
  return (
    <Card
      sx={{
        p: 3,
        height: CHART_CARD_HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "2px dashed",
        borderColor: "divider",
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.disabled" mt={1}>
        Provide chart data to enable this panel
      </Typography>
    </Card>
  );
}
