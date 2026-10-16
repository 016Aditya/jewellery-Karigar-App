import React, { useMemo } from "react";
import { Card, Typography, Box, CircularProgress, Alert } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { useGetTopSellingItemsQuery } from "../../features/api/apiSlice";

const METAL_COLORS = {
  GOLD: "#C9A84C",
  SILVER: "#9AA5B1",
  PLATINUM: "#5B8DEF",
};

const METAL_LABELS = {
  GOLD: "Gold",
  SILVER: "Silver",
  PLATINUM: "Platinum",
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 240,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} mb={0.75}>
        {label}
      </Typography>
      {payload.map((entry) => {
        const items = entry.payload[`${entry.dataKey}_items`] || [];
        return (
          <Box key={entry.dataKey} mb={0.75}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: entry.fill,
                  flexShrink: 0,
                }}
              />
              <Typography variant="caption" fontWeight={700}>
                {METAL_LABELS[entry.dataKey] || entry.dataKey}: {entry.value}
              </Typography>
            </Box>
            {items.length > 0 && (
              <Box pl={2.5} mt={0.25}>
                {items.map((it) => (
                  <Typography
                    key={it.name}
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {it.name} — {it.qty}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default function TopSellingItemsChart({ cardHeight = 460 } = {}) {
  const theme = useTheme();

  const { data: rawData = [], isLoading, isError, error } = useGetTopSellingItemsQuery();

  const chartData = useMemo(() => {
    const byMonth = new Map();

    for (const row of rawData) {
      if (!byMonth.has(row.month)) {
        byMonth.set(row.month, {
          month: row.monthLabel,
          GOLD: 0,
          SILVER: 0,
          PLATINUM: 0,
          GOLD_items: [],
          SILVER_items: [],
          PLATINUM_items: [],
        });
      }
      const entry = byMonth.get(row.month);
      entry[row.metalType] += row.quantitySold;
      entry[`${row.metalType}_items`].push({ name: row.productName, qty: row.quantitySold });
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [rawData]);

  return (
    <Card
      sx={{
        p: 3,
        height: cardHeight,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mb={2}
      >
        <Typography
          variant="subtitle2"
          color="primary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.5}
        >
          Top 5 Selling Items — Last 6 Months
        </Typography>
      </Box>

      <Box flex={1} minHeight={0}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress size={32} />
          </Box>
        ) : isError ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error?.data?.message ?? "Failed to load top selling items data."}
          </Alert>
        ) : chartData.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
            color="text.secondary"
          >
            <Typography variant="body2">No sales data for the selected period.</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
              <XAxis
                dataKey="month"
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={theme.palette.text.secondary}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                label={{
                  value: "Sales Volume",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: theme.palette.text.secondary },
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: 8 }}
                iconType="circle"
                iconSize={10}
                formatter={(value) => METAL_LABELS[value] || value}
              />
              <Bar dataKey="GOLD" name="GOLD" stackId="metals" fill={METAL_COLORS.GOLD} radius={[0, 0, 0, 0]} />
              <Bar dataKey="SILVER" name="SILVER" stackId="metals" fill={METAL_COLORS.SILVER} radius={[0, 0, 0, 0]} />
              <Bar
                dataKey="PLATINUM"
                name="PLATINUM"
                stackId="metals"
                fill={METAL_COLORS.PLATINUM}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
    </Card>
  );
}
