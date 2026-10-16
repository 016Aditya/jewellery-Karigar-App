import React from "react";
import { Box, Card, Skeleton, Typography } from "@mui/material";

// Enterprise-grade KPI tile for the dashboard header strip — icon chip, accent bar,
// big number, and a muted subtitle. Kept dumb/presentational so Dashboard.jsx owns
// the data shape.
export default function DashboardStatCard({ label, value, sub, color, icon: Icon, loading }) {
  if (loading) {
    return (
      <Card
        elevation={0}
        sx={{
          p: 2.5,
          height: "100%",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="circular" width={34} height={34} />
        </Box>
        <Skeleton variant="text" width="40%" height={40} sx={{ my: 0.5 }} />
        <Skeleton variant="text" width="70%" height={18} />
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        p: 2.5,
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: 4,
          transform: "translateY(-2px)",
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 3,
          bgcolor: color,
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography
          variant="caption"
          color="text.secondary"
          textTransform="uppercase"
          fontWeight={700}
          letterSpacing={0.4}
          sx={{ lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        {Icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (theme) => {
                const [group, key] = String(color).split(".");
                const base = theme.palette[group]?.[key] || theme.palette.primary.main;
                return theme.palette.mode === "dark"
                  ? `${base}33`
                  : `${base}1a`;
              },
              color: color,
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )}
      </Box>

      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ color: "text.primary", lineHeight: 1.15 }}
      >
        {value}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        {sub}
      </Typography>
    </Card>
  );
}
