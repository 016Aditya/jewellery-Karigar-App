import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import {
  Dashboard,
  LocalShipping,
  Receipt,
  CollectionsBookmark,
  Edit,
  AccountBalanceWallet,
  Engineering,
} from "@mui/icons-material";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import ThemeToggle from "./ThemeToggle";
import { updateMetalRate } from "../features/ui/uiSlice";
import { getMetalColor } from "../utils/metalColors";
import useBackendStatus from "../hooks/useBackendStatus";

const RATE_API_BASE = "http://localhost:8090/api/metal-rate";
const CATALOGUE_API_BASE = "http://localhost:8090/api/catalogue";
const DEFAULT_METAL = "GOLD";
const ROTATE_INTERVAL_MS = 3500;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const backendOnline = useBackendStatus();

  // Read the global state directly from Redux (Fetched by App.jsx)
  const { rates = {} } = useSelector((state) => state.ui) || {};

  const [metalTypes, setMetalTypes] = useState([DEFAULT_METAL]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [openEdit, setOpenEdit] = useState(false);
  const [newRate, useStateRate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const rotateTimer = useRef(null);

  useEffect(() => {
    fetch(`${CATALOGUE_API_BASE}/metal-types`)
      .then((res) => (res.ok ? res.json() : []))
      .then((types) => types.length && setMetalTypes(types))
      .catch(() => {});
  }, []);

  // Auto-loop the carousel through every metal type; pause while the edit dialog is open
  useEffect(() => {
    if (openEdit || metalTypes.length <= 1) return undefined;
    rotateTimer.current = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % metalTypes.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(rotateTimer.current);
  }, [openEdit, metalTypes.length]);

  const activeMetal =
    metalTypes[carouselIndex % metalTypes.length] || DEFAULT_METAL;
  const { rate: activeRate = 0, change: activeChange = 0 } =
    rates[activeMetal] || {};

  // Added Karigar to the menu
  const menu = [
    { text: "Dashboard", path: "/", icon: <Dashboard /> },
    { text: "Live Tracking", path: "/tracking", icon: <LocalShipping /> },
    { text: "Billing", path: "/billing", icon: <Receipt /> },
    { text: "Catalogue", path: "/catalogue", icon: <CollectionsBookmark /> },
    { text: "Karigar Job Cards", path: "/karigar", icon: <LocalAtmIcon /> },
    {
      text: "Karigar Management",
      path: "/karigarManagement",
      icon: <Engineering />,
    },
    {
      text: "Karigar Gold Ledger",
      path: "/karigarLedger",
      icon: <AccountBalanceWallet />,
    },
  ];

  // --- API: Update Metal Rate (for whichever metal the carousel is currently showing) ---
  const handleUpdateRate = async () => {
    const parsedRate = parseFloat(newRate);
    if (!newRate || isNaN(parsedRate) || parsedRate <= 0) {
      setToast({ msg: "Please enter a valid rate", severity: "warning" });
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`${RATE_API_BASE}/${activeMetal}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: parsedRate }),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Refresh just this metal's rate in Redux — no full page reload needed
      const refreshed = await fetch(`${RATE_API_BASE}/${activeMetal}/current`);
      if (refreshed.ok) {
        dispatch(updateMetalRate(await refreshed.json()));
      }

      setToast({
        msg: `${activeMetal.replace("_", " ")} rate updated successfully!`,
        severity: "success",
      });
      setOpenEdit(false);
      useStateRate("");
    } catch (error) {
      console.error(error);
      setToast({ msg: "Error updating metal rate", severity: "error" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: 220,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: 220,
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              color="primary"
              fontWeight={700}
              fontFamily="Georgia, serif"
              lineHeight={1.2}
            >
              SLS
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              letterSpacing={3}
            >
              JEWELLERY
            </Typography>
          </Box>

          <Box
            title={backendOnline ? "Backend online" : "Backend unreachable"}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: backendOnline ? "success.main" : "error.main",
                boxShadow: backendOnline
                  ? "0 0 0 3px rgba(46, 125, 50, 0.18)"
                  : "0 0 0 3px rgba(211, 47, 47, 0.18)",
                animation: backendOnline ? "sidebarPulse 2s infinite" : "none",
                "@keyframes sidebarPulse": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.35 },
                  "100%": { opacity: 1 },
                },
              }}
            />
            <Typography
              variant="caption"
              fontWeight={700}
              letterSpacing={0.3}
              color={backendOnline ? "success.main" : "error.main"}
            >
              {backendOnline ? "Online" : "Offline"}
            </Typography>
          </Box>
        </Box>

        <List sx={{ flexGrow: 1, px: 1 }}>
          {menu.map((item) => {
            const active = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  bgcolor: active ? "action.selected" : "transparent",
                  color: active ? "primary.main" : "text.secondary",
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        {/* Live Rate Carousel — auto-rotates through every metal, Gold included */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <ThemeToggle />
          </Box>

          <Box
            sx={{
              borderRadius: 2.5,
              border: 1,
              borderColor: "divider",
              bgcolor: "action.hover",
              p: 1.75,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Metal accent bar */}
            <Box
              key={`accent-${activeMetal}`}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 3,
                height: "100%",
                bgcolor: getMetalColor(activeMetal),
                transition: "background-color 0.3s ease",
              }}
            />

            {/* Header row: label (flexible) + edit icon (fixed slot, never shifts) */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={0.75}
            >
              <Box
                display="flex"
                alignItems="center"
                gap={0.5}
                minWidth={0}
                flex={1}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "success.main",
                    flexShrink: 0,
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1 },
                      "50%": { opacity: 0.3 },
                      "100%": { opacity: 1 },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  letterSpacing={0.5}
                  noWrap
                  sx={{
                    transition: "opacity 0.2s",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  key={activeMetal}
                >
                  LIVE {activeMetal.replace("_", " ")}
                </Typography>
              </Box>

              {/* Fixed-position edit icon — own slot, unaffected by label length */}
              <IconButton
                size="small"
                onClick={() => {
                  useStateRate(activeRate ? String(activeRate) : "");
                  setOpenEdit(true);
                }}
                disabled={updating}
                sx={{
                  padding: "3px",
                  flexShrink: 0,
                  ml: 1,
                  color: "text.secondary",
                  "&:hover": {
                    color: "primary.main",
                    bgcolor: "action.selected",
                  },
                }}
              >
                <Edit sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>

            {/* Skeleton placeholder while waiting for Redux to populate from App.jsx —
                shaped like the real price + change-badge row so nothing jumps once data lands */}
            {activeRate === 0 ? (
              <Box>
                <Box display="flex" alignItems="baseline" gap={0.75}>
                  <Skeleton variant="text" width={90} height={32} />
                  <Skeleton variant="text" width={14} height={18} />
                </Box>
                <Box display="flex" alignItems="center" gap={0.6} mt={0.6}>
                  <Skeleton
                    variant="rounded"
                    width={54}
                    height={18}
                    sx={{ borderRadius: 1 }}
                  />
                  <Skeleton variant="text" width={30} height={16} />
                </Box>
              </Box>
            ) : (
              <Box
                key={activeMetal}
                sx={{
                  animation: "fadeIn 0.3s ease",
                  "@keyframes fadeIn": {
                    from: { opacity: 0, transform: "translateY(2px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                <Box display="flex" alignItems="baseline" gap={0.75}>
                  <Typography
                    variant="h5"
                    fontFamily="Georgia, serif"
                    fontWeight={600}
                    sx={{ color: getMetalColor(activeMetal), lineHeight: 1.2 }}
                  >
                    ₹{activeRate.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    /g
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={0.4} mt={0.6}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.3,
                      px: 0.8,
                      py: 0.15,
                      borderRadius: 1,
                      bgcolor:
                        activeChange >= 0
                          ? "rgba(46, 125, 50, 0.12)"
                          : "rgba(211, 47, 47, 0.12)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={activeChange >= 0 ? "success.main" : "error.main"}
                    >
                      {activeChange >= 0 ? "▲" : "▼"}{" "}
                      {Math.abs(activeChange).toFixed(2)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.disabled">
                    today
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Carousel position dots — colored to match each metal's swatch */}
          <Box display="flex" justifyContent="center" gap={0.7} mt={1.25}>
            {metalTypes.map((m, i) => {
              const isActive = i === carouselIndex % metalTypes.length;
              return (
                <Box
                  key={m}
                  onClick={() => setCarouselIndex(i)}
                  sx={{
                    width: isActive ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    bgcolor: isActive ? getMetalColor(m) : "divider",
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Drawer>

      {/* Edit Metal Rate Modal — always targets whichever metal the carousel is showing */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Update {activeMetal.replace("_", " ")} Rate
        </DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField
            autoFocus
            label="New Rate (per gram)"
            type="number"
            fullWidth
            value={newRate}
            onChange={(e) => useStateRate(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleUpdateRate()}
            disabled={updating}
            helperText={`Current rate: ₹${activeRate.toLocaleString()}`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setOpenEdit(false)}
            color="inherit"
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateRate}
            variant="contained"
            color="primary"
            disabled={updating}
            startIcon={
              updating ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {updating ? "Updating..." : "Update Rate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity || "info"}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
