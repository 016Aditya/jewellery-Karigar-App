import { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { getMetalColor } from "../utils/metalColors";
import {
  useGetCategoriesQuery,
  useGetMetalTypesQuery,
  useGetCatalogueProductsQuery,
  useLazyGetCatalogueProductsQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} from "../features/api/apiSlice";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Tooltip,
  Divider,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  List,
  ListItem,
  Skeleton,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Search,
  GridView,
  ViewList,
  Close,
  Scale,
  Category,
  Warning,
  Sort,
  Visibility,
  InfoOutlined,
} from "@mui/icons-material";

const PURITIES = ["24K", "22K", "18K", "14K", "9K"];
const DEFAULT_METAL_TYPES = [
  "GOLD",
  "SILVER",
  "PLATINUM",
  "WHITE_GOLD",
  "ROSE_GOLD",
  "YELLOW_GOLD",
];

// Per the billing reference guide: Rose/White Gold are 18K alloys billed at the full 18K
// gold rate (never their own metal rate), so their purity is fixed — not user-choosable.
// Silver and Platinum each offer a couple of real purity grades and stay user-selectable.
const PURITY_OPTIONS_BY_METAL = {
  GOLD: PURITIES,
  YELLOW_GOLD: PURITIES,
  ROSE_GOLD: ["18K"],
  WHITE_GOLD: ["18K"],
  SILVER: ["925", "1000"],
  PLATINUM: ["950", "1000"],
};
const LOCKED_PURITY_METALS = ["ROSE_GOLD", "WHITE_GOLD"];
const isPurityLocked = (metal) => LOCKED_PURITY_METALS.includes(metal);
const getPurityOptions = (metal) => PURITY_OPTIONS_BY_METAL[metal] || PURITIES;
// Every catalogue card is a fixed CARD_SIZE x CARD_SIZE square — width never stretches
// with the viewport, so a long name/description can never make one card bigger than
// its neighbors. The grid itself is plain CSS grid (not MUI's percentage-based Grid),
// so column count is purely a function of how many fixed-width tiles fit per row.
const CARD_SIZE = 300;
const CARD_GRID_SX = {
  display: "grid",
  gridTemplateColumns: `repeat(auto-fill, ${CARD_SIZE}px)`,
  gap: 2,
  justifyContent: "start",
};

const formatMetal = (m) => (m || "").replace("_", " ");

// Only surface the info icon when a field is actually long enough to be truncated —
// short/empty content never shows it, so the card stays visually uncluttered.
const NAME_TRUNC_LEN = 22;
const CODE_LINE_TRUNC_LEN = 30;
const DESC_TRUNC_LEN = 46;
const needsInfoIcon = (item) => {
  const codeLine = `${item.code} · ${item.categoryName}`;
  const hasLongDescription =
    Boolean(item.description) && item.description.length > DESC_TRUNC_LEN;
  return (
    (item.name || "").length > NAME_TRUNC_LEN ||
    codeLine.length > CODE_LINE_TRUNC_LEN ||
    hasLongDescription
  );
};

const EMPTY_FORM = {
  img: "💍",
  name: "",
  code: "",
  categoryId: "",
  purity: "22K",
  weight: "",
  makingPercent: "",
  description: "",
  metalType: "GOLD",
};

const EMOJI_OPTIONS = [
  "💍",
  "📿",
  "⌚",
  "👂",
  "🔗",
  "🎁",
  "💪",
  "🦶",
  "✨",
  "🏅",
  "⚜️",
  "🌟",
];

function StatBadge({ label, value, icon, color = "primary.main" }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: "background.paper",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <Box sx={{ color, display: "flex" }}>{icon}</Box>
      <Box>
        <Typography
          fontSize={10}
          color="text.secondary"
          fontWeight={600}
          letterSpacing={0.5}
          textTransform="uppercase"
        >
          {label}
        </Typography>
        <Typography fontSize={15} fontWeight={700} color="text.primary">
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function CatalogueCardSkeleton() {
  return (
    <Card
      sx={{
        p: 0,
        width: CARD_SIZE,
        height: CARD_SIZE,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" height={3} />
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Skeleton variant="rounded" width={36} height={36} />
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            gap={0.5}
          >
            <Skeleton variant="rounded" width={46} height={18} />
            <Skeleton variant="rounded" width={38} height={18} />
          </Box>
        </Box>

        <Skeleton width="65%" height={18} />
        <Skeleton width="80%" height={13} />
        <Skeleton width="90%" height={13} />

        <Box display="flex" gap={0.6}>
          <Skeleton variant="rounded" width="100%" height={30} />
          <Skeleton variant="rounded" width="100%" height={30} />
          <Skeleton variant="rounded" width="100%" height={30} />
        </Box>

        <Skeleton variant="rounded" height={28} />

        <Box sx={{ mt: "auto" }}>
          <Divider sx={{ mb: 1 }} />
          <Box display="flex" gap={1}>
            <Skeleton variant="rounded" width="100%" height={26} />
            <Skeleton variant="rounded" width={26} height={26} />
            <Skeleton variant="rounded" width={26} height={26} />
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

function CatalogueListRowSkeleton() {
  return (
    <Card
      sx={{
        mb: 1,
        p: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Skeleton variant="rounded" width={36} height={22} />
      <Box flex={1} minWidth={0}>
        <Skeleton width="50%" height={18} sx={{ mb: 0.5 }} />
        <Skeleton width="70%" height={14} />
      </Box>
      <Skeleton variant="rounded" width={48} height={20} />
      <Box textAlign="right" minWidth={60}>
        <Skeleton width={40} height={14} sx={{ ml: "auto", mb: 0.5 }} />
        <Skeleton width={30} height={16} sx={{ ml: "auto" }} />
      </Box>
      <Box textAlign="right" minWidth={60}>
        <Skeleton width={40} height={14} sx={{ ml: "auto", mb: 0.5 }} />
        <Skeleton width={30} height={16} sx={{ ml: "auto" }} />
      </Box>
      <Box textAlign="right" minWidth={90}>
        <Skeleton width={50} height={14} sx={{ ml: "auto", mb: 0.5 }} />
        <Skeleton width={60} height={18} sx={{ ml: "auto" }} />
      </Box>
      <Box display="flex" gap={0.5} ml={2}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="circular" width={24} height={24} />
      </Box>
    </Card>
  );
}

function CatalogueCard({ item, onEdit, onDelete, onView }) {
  const showInfo = needsInfoIcon(item);

  return (
    <Card
      sx={{
        p: 0,
        width: CARD_SIZE,
        height: CARD_SIZE,
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        transition: "all 0.22s ease",
        "&:hover": {
          boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{ height: 3, background: "linear-gradient(90deg,#D4AF37,#B8860B)" }}
      />
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Header: icon + metal/purity chips */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              bgcolor: "goldAccent.lightBg",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "goldAccent.border",
            }}
          >
            {item.img}
          </Box>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            gap={0.5}
          >
            <Chip
              label={formatMetal(item.metalType)}
              size="small"
              sx={{
                fontSize: 9,
                height: 18,
                bgcolor: getMetalColor(item.metalType),
                color: "#000",
                fontWeight: 700,
              }}
            />
            <Chip
              label={item.purity}
              size="small"
              sx={{
                fontSize: 9,
                height: 18,
                bgcolor: "goldAccent.lightBg",
                color: "goldAccent.text",
                border: "1px solid",
                borderColor: "goldAccent.main",
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        {/* Name — the info icon only appears when something here is actually truncated */}
        <Box display="flex" alignItems="center" gap={0.5} minHeight={18}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            fontSize={13}
            lineHeight={1.3}
            noWrap
            sx={{ flex: 1, minWidth: 0 }}
          >
            {item.name}
          </Typography>
          {showInfo && (
            <Tooltip
              arrow
              placement="top"
              title={
                <Box sx={{ maxWidth: 260, p: 0.5 }}>
                  <Typography fontSize={12} fontWeight={700}>
                    {item.name}
                  </Typography>
                  <Typography fontSize={11} sx={{ opacity: 0.85 }}>
                    {item.code} · {item.categoryName}
                  </Typography>
                  <Typography
                    fontSize={11}
                    mt={0.5}
                    sx={{ whiteSpace: "pre-wrap" }}
                  >
                    {item.description || "No description provided."}
                  </Typography>
                </Box>
              }
            >
              <IconButton size="small" sx={{ p: 0.3, flexShrink: 0 }}>
                <InfoOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Code / category — single line, ellipsis if too long */}
        <Typography
          variant="caption"
          color="text.secondary"
          fontFamily="monospace"
          fontSize={11}
          noWrap
          sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {item.code} · {item.categoryName}
        </Typography>

        {/* Description — single line, ellipsis if too long (icon above covers the rest) */}
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{
            fontSize: 11,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.description || "No description provided."}
        </Typography>

        {/* Weight / Making / Purity — compact, equal-width tiles */}
        <Box display="flex" gap={0.6}>
          {[
            { label: "Wt", value: `${item.weight}g` },
            { label: "Mkg", value: `${item.makingPercent}%` },
            { label: "Purity", value: item.purity },
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{
                flex: 1,
                minWidth: 0,
                p: "4px 2px",
                bgcolor: "surface.light",
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              <Typography
                noWrap
                sx={{
                  fontSize: 8,
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Typography>
              <Typography
                noWrap
                sx={{ fontSize: 11, fontWeight: 600, color: "text.primary" }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* MRP highlight */}
        <Box
          sx={{
            p: "6px 8px",
            bgcolor: "goldAccent.lightBg",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "goldAccent.border",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{
              fontSize: 9,
              fontWeight: 700,
              color: "goldAccent.text",
              textTransform: "uppercase",
            }}
          >
            Est. MRP
          </Typography>
          <Typography
            sx={{ fontSize: 14, fontWeight: 800, color: "goldAccent.text" }}
          >
            ₹{(item.mrp || 0).toLocaleString()}
          </Typography>
        </Box>

        {/* Actions — pinned to the bottom of the fixed-height card */}
        <Box sx={{ mt: "auto" }}>
          <Divider sx={{ mb: 1 }} />
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Visibility sx={{ fontSize: 14 }} />}
              onClick={() => onView(item)}
              fullWidth
              sx={{
                fontSize: 12,
                py: 0.4,
                borderColor: "divider",
                color: "text.secondary",
              }}
            >
              View
            </Button>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit(item)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  p: "4px 8px",
                  color: "goldAccent.text",
                }}
              >
                <Edit sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(item)}
                sx={{
                  border: "1px solid",
                  borderColor: "error.light",
                  borderRadius: 1,
                  p: "4px 8px",
                }}
              >
                <Delete sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

function CatalogueListRow({ item, onEdit, onDelete, onView }) {
  return (
    <Card
      sx={{
        mb: 1,
        p: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        border: "1px solid",
        borderColor: "divider",
        "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
      }}
    >
      <Box sx={{ fontSize: 22, width: 36, textAlign: "center" }}>
        {item.img}
      </Box>
      <Box flex={1} minWidth={0}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {item.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          fontFamily="monospace"
        >
          {item.code} · {item.categoryName} · {formatMetal(item.metalType)}
        </Typography>
      </Box>
      <Chip
        label={item.purity}
        size="small"
        sx={{
          bgcolor: "goldAccent.lightBg",
          color: "goldAccent.text",
          border: "1px solid",
          borderColor: "goldAccent.main",
          fontWeight: 700,
          fontSize: 10,
        }}
      />
      <Box textAlign="right" minWidth={60}>
        <Typography variant="caption" color="text.secondary" display="block">
          Weight
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {item.weight}g
        </Typography>
      </Box>
      <Box textAlign="right" minWidth={60}>
        <Typography variant="caption" color="text.secondary" display="block">
          Making
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {item.makingPercent}%
        </Typography>
      </Box>
      <Box textAlign="right" minWidth={90}>
        <Typography variant="caption" color="text.secondary" display="block">
          MRP
        </Typography>
        <Typography variant="body2" fontWeight={800} color="goldAccent.text">
          ₹{(item.mrp || 0).toLocaleString()}
        </Typography>
      </Box>
      <Box display="flex" gap={0.5} ml={2}>
        <IconButton size="small" onClick={() => onView(item)}>
          <Visibility sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onEdit(item)}
          sx={{ color: "goldAccent.text" }}
        >
          <Edit sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton size="small" color="error" onClick={() => onDelete(item)}>
          <Delete sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Card>
  );
}

function ViewDialog({ open, item, onClose }) {
  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Item Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3, pb: 4 }}>
        <Box display="flex" gap={3} alignItems="flex-start" mb={3}>
          <Box
            sx={{
              width: 80,
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              bgcolor: "goldAccent.lightBg",
              borderRadius: 3,
              border: "2px solid",
              borderColor: "goldAccent.border",
              flexShrink: 0,
            }}
          >
            {item.img}
          </Box>
          <Box>
            <Typography
              variant="h5"
              fontWeight={800}
              mb={0.5}
              sx={{ color: "text.primary" }}
            >
              {item.name}
            </Typography>
            <Box display="flex" gap={1} mb={1}>
              <Chip
                label={item.code}
                size="small"
                sx={{ fontFamily: "monospace", fontSize: 11 }}
              />
              <Chip
                label={item.categoryName}
                size="small"
                variant="outlined"
                sx={{ fontSize: 11 }}
              />
              <Chip
                label={formatMetal(item.metalType)}
                size="small"
                sx={{
                  bgcolor: getMetalColor(item.metalType),
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
              <Chip
                label={item.purity}
                size="small"
                sx={{
                  bgcolor: "goldAccent.lightBg",
                  color: "goldAccent.text",
                  border: "1px solid",
                  borderColor: "goldAccent.main",
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
            </Box>
          </Box>
        </Box>

        <Typography
          variant="subtitle2"
          color="text.secondary"
          textTransform="uppercase"
          letterSpacing={1}
          mb={1}
        >
          Description
        </Typography>
        <Typography
          variant="body2"
          color="text.primary"
          mb={3}
          sx={{
            lineHeight: 1.6,
            bgcolor: "surface.light",
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {item.description || "No description provided for this item."}
        </Typography>

        <Typography
          variant="subtitle2"
          color="text.secondary"
          textTransform="uppercase"
          letterSpacing={1}
          mb={1}
        >
          Pricing Breakdown
        </Typography>
        <Box
          sx={{
            bgcolor: "goldAccent.lightBg",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "goldAccent.border",
            p: 2,
          }}
        >
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Weight
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {item.weight}g
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Making Charge
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {item.makingPercent}%
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ borderColor: "goldAccent.border", mb: 2 }} />
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Metal Value ({item.purity})
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{(item.metalValue || 0).toLocaleString()}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Making Amount ({item.makingPercent}%)
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{(item.makingAmount || 0).toLocaleString()}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="body2" color="text.secondary">
              GST (3%)
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              ₹{(item.gstAmount || 0).toLocaleString()}
            </Typography>
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            pt={1}
            borderTop="1px dashed"
            borderColor="goldAccent.main"
          >
            <Typography
              variant="subtitle1"
              fontWeight={800}
              color="goldAccent.text"
            >
              Estimated MRP
            </Typography>
            <Typography variant="h5" fontWeight={800} color="goldAccent.text">
              ₹{(item.mrp || 0).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  open,
  onClose,
  onSave,
  initial,
  existingCodes,
  categories,
  metalTypeOptions,
  defaultMetal,
}) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      // Only one metal item can be added per save — the catalogue tab currently being
      // viewed is what you're adding to, so it's pre-selected here (not left blank).
      setForm(
        initial || {
          ...EMPTY_FORM,
          categoryId: categories[0]?.id || "",
          metalType: defaultMetal || EMPTY_FORM.metalType,
          purity: getPurityOptions(defaultMetal)[0] || EMPTY_FORM.purity,
        },
      );
      setErrors({});
    }
  }, [initial, open, categories, defaultMetal]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setMetalType = (metal) => {
    setForm((f) => ({
      ...f,
      metalType: metal,
      // Purity options are metal-specific (karats for gold, 925 for silver, 950 for
      // platinum, locked 18K for rose/white) — reset to that metal's default so a
      // stale purity from the previous selection is never silently carried over.
      purity: getPurityOptions(metal)[0],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.categoryId) e.categoryId = "Required";
    if (!form.code.trim()) e.code = "Required";
    else if (!isEdit && existingCodes.includes(form.code.trim().toUpperCase()))
      e.code = "Exists";
    if (!form.metalType) e.metalType = "Select a metal";
    if (!form.weight || isNaN(form.weight) || +form.weight <= 0)
      e.weight = "Invalid";
    if (
      form.makingPercent === "" ||
      isNaN(form.makingPercent) ||
      +form.makingPercent < 0
    )
      e.makingPercent = "Invalid";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) return setErrors(e);
    onSave({
      ...form,
      code: form.code.trim().toUpperCase(),
      weight: parseFloat(form.weight),
      makingPercent: parseFloat(form.makingPercent),
      // Backend still accepts a metal-list payload (one row per metal); the UI now only
      // ever selects a single metal per save, so it's always a one-element array.
      metalTypes: [form.metalType],
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {isEdit ? "Edit Item" : "Add New Item"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Pricing is auto-calculated per metal using its live rate
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Icon
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
              {EMOJI_OPTIONS.map((e) => (
                <Box
                  key={e}
                  onClick={() => setForm((f) => ({ ...f, img: e }))}
                  sx={{
                    width: 38,
                    height: 38,
                    fontSize: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 1.5,
                    border: "2px solid",
                    cursor: "pointer",
                    borderColor: form.img === e ? "goldAccent.main" : "divider",
                    bgcolor:
                      form.img === e
                        ? "goldAccent.lightBg"
                        : "background.paper",
                  }}
                >
                  {e}
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Typography
              variant="caption"
              color={errors.metalType ? "error" : "text.secondary"}
              fontWeight={600}
            >
              Metal{" "}
              {errors.metalType ? `— ${errors.metalType}` : ""}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
              {metalTypeOptions.map((m) => {
                const active = form.metalType === m;
                return (
                  <Chip
                    key={m}
                    label={formatMetal(m)}
                    onClick={() => setMetalType(m)}
                    sx={{
                      fontWeight: 700,
                      bgcolor: active
                        ? "goldAccent.lightBg"
                        : "background.paper",
                      color: active ? "goldAccent.text" : "text.secondary",
                      border: "1px solid",
                      borderColor: active ? "goldAccent.main" : "divider",
                    }}
                  />
                );
              })}
            </Box>
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField
              label="Item Name"
              value={form.name}
              onChange={set("name")}
              fullWidth
              size="small"
              error={!!errors.name}
              helperText={errors.name}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Item Code"
              value={form.code}
              onChange={set("code")}
              fullWidth
              size="small"
              error={!!errors.code}
              helperText={errors.code}
              required
              placeholder="e.g. RNG-005"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" error={!!errors.categoryId}>
              <InputLabel>Category *</InputLabel>
              <Select
                value={form.categoryId}
                onChange={set("categoryId")}
                label="Category *"
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              size="small"
              disabled={isPurityLocked(form.metalType)}
            >
              <InputLabel>Purity</InputLabel>
              <Select
                value={form.purity}
                onChange={set("purity")}
                label="Purity"
              >
                {getPurityOptions(form.metalType).map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </Select>
              {isPurityLocked(form.metalType) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, ml: 0.5 }}
                >
                  {formatMetal(form.metalType)} is always billed at{" "}
                  {getPurityOptions(form.metalType)[0]}
                </Typography>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Weight"
              value={form.weight}
              onChange={set("weight")}
              fullWidth
              size="small"
              type="number"
              inputProps={{ step: 0.1, min: 0.1 }}
              error={!!errors.weight}
              helperText={errors.weight}
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Making %"
              value={form.makingPercent}
              onChange={set("makingPercent")}
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 0 }}
              error={!!errors.makingPercent}
              helperText={errors.makingPercent}
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={form.description}
              onChange={set("description")}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderColor: "divider", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {isEdit ? "Save Changes" : "Add Item"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ManageCategoryDialog({
  open,
  onClose,
  categories,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [newCat, setNewCat] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!open) {
      setNewCat("");
      setEditingCatId(null);
      setEditValue("");
    }
  }, [open]);

  const handleAdd = () => {
    const val = newCat.trim();
    if (
      !val ||
      categories.some((c) => c.name.toLowerCase() === val.toLowerCase())
    )
      return;
    onAdd(val);
    setNewCat("");
  };

  const handleSaveEdit = (cat) => {
    const val = editValue.trim();
    if (
      !val ||
      categories.some(
        (c) => c.name.toLowerCase() === val.toLowerCase() && c.id !== cat.id,
      )
    ) {
      setEditingCatId(null);
      return;
    }
    if (val !== cat.name) onEdit(cat.id, val);
    setEditingCatId(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Manage Categories
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3, pb: 3 }}>
        <Box display="flex" gap={1.5} mb={3}>
          <TextField
            label="New Category"
            size="small"
            fullWidth
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            sx={{ px: 3, borderRadius: 1.5 }}
          >
            Add
          </Button>
        </Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          mb={1}
          textTransform="uppercase"
          letterSpacing={1}
        >
          Existing Categories
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <List disablePadding>
            {categories.map((cat, index) => (
              <ListItem
                key={cat.id}
                divider={index !== categories.length - 1}
                secondaryAction={
                  editingCatId === cat.id ? (
                    <Button
                      size="small"
                      onClick={() => handleSaveEdit(cat)}
                      variant="outlined"
                      sx={{ py: 0.3 }}
                    >
                      Save
                    </Button>
                  ) : (
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditValue(cat.name);
                        }}
                        sx={{ color: "goldAccent.text" }}
                      >
                        <Edit sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDelete(cat.id)}
                      >
                        <Delete sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  )
                }
              >
                {editingCatId === cat.id ? (
                  <TextField
                    size="small"
                    fullWidth
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    onKeyPress={(e) => e.key === "Enter" && handleSaveEdit(cat)}
                    sx={{ mr: 6 }}
                  />
                ) : (
                  <Typography variant="body2" fontWeight={600}>
                    {cat.name}
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>
          {categories.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              py={2}
            >
              No categories exist.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ open, item, onClose, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Warning color="error" />
        <Typography fontWeight={700}>Delete Item</Typography>
      </DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{item?.name}</strong> and all
          its metal variants? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Catalogue() {
  const rates = useSelector((state) => state.ui?.rates) || {};

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterPurity, setFilterPurity] = useState("All");
  const [activeMetal, setActiveMetal] = useState(DEFAULT_METAL_TYPES[0]);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [manageCatOpen, setManageCatOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg, severity = "success") => setToast({ msg, severity });

  // RTK Query caches each of these; categories/metal-types rarely change, and the
  // products list is cached per metal-type tag so re-visiting a tab reuses cached data
  // instead of hitting the DB again — only writes below explicitly bust the cache.
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: metalTypesFetched } = useGetMetalTypesQuery();
  const metalTypeOptions =
    metalTypesFetched && metalTypesFetched.length
      ? metalTypesFetched
      : DEFAULT_METAL_TYPES;

  useEffect(() => {
    if (metalTypeOptions.length && !metalTypeOptions.includes(activeMetal)) {
      setActiveMetal(metalTypeOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metalTypeOptions]);

  const {
    data: fetchedItems = [],
    isFetching: isLoading,
    isSuccess,
    isError,
    refetch: refetchProducts,
  } = useGetCatalogueProductsQuery({
    metalType: activeMetal,
    categoryId: filterCat,
  });

  // Guard against ever rendering another tab's data: only trust the response once it has
  // actually resolved for the metal currently selected, and only items that really belong
  // to it. While loading (or on error) this is empty, so the skeleton/error state show
  // instead of leftover data from whatever tab was active before.
  const items = useMemo(
    () =>
      isSuccess ? fetchedItems.filter((i) => i.metalType === activeMetal) : [],
    [isSuccess, fetchedItems, activeMetal],
  );

  const [fetchVariants] = useLazyGetCatalogueProductsQuery();
  const [addCategory] = useAddCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [addProduct] = useAddProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const processedItems = useMemo(() => {
    let result = items.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.categoryName || "").toLowerCase().includes(q);
      const matchPurity =
        filterPurity === "All" || item.purity === filterPurity;
      return matchSearch && matchPurity;
    });

    switch (sortBy) {
      case "price-asc":
        return result.sort((a, b) => (a.mrp || 0) - (b.mrp || 0));
      case "price-desc":
        return result.sort((a, b) => (b.mrp || 0) - (a.mrp || 0));
      case "weight-asc":
        return result.sort((a, b) => a.weight - b.weight);
      case "weight-desc":
        return result.sort((a, b) => b.weight - a.weight);
      default:
        return result.sort((a, b) => b.id - a.id);
    }
  }, [items, search, filterPurity, sortBy]);

  const stats = useMemo(() => {
    const uniqueProducts = new Map();
    items.forEach((i) => uniqueProducts.set(i.productId, i));
    const uniqueList = [...uniqueProducts.values()];
    return {
      total: uniqueList.length,
      totalWeight: uniqueList.reduce((s, i) => s + i.weight, 0).toFixed(1),
    };
  }, [items]);

  const handleSaveItem = async (form) => {
    try {
      const isEdit = Boolean(editItem);
      if (isEdit) {
        await updateProduct({
          id: editItem.productId,
          previousMetalTypes: [editItem.metalType],
          ...form,
        }).unwrap();
      } else {
        await addProduct(form).unwrap();
      }
      notify(
        `"${form.name}" ${isEdit ? "updated" : "added to catalogue"} successfully`,
      );
      setDialogOpen(false);
    } catch (err) {
      notify(err.data || err.message || "Failed to save product", "error");
    }
  };

  const handleDeleteItemConfirm = async () => {
    if (!deleteItem) return;
    try {
      await deleteProduct({
        id: deleteItem.productId,
        // We only know this variant's own metal type from the current tab; fetch the
        // full set so every affected cache partition gets invalidated, not just this one.
        metalTypes: (
          await fetchVariants({ productId: deleteItem.productId }).unwrap()
        ).map((v) => v.metalType),
      }).unwrap();
      notify(`"${deleteItem.name}" deleted`, "info");
    } catch (err) {
      notify(err.data || err.message || "Failed to delete product", "error");
    } finally {
      setDeleteItem(null);
    }
  };

  // Editing only ever touches the single variant currently on screen — the item already
  // carries its own metalType, so no extra fetch is needed to open the form.
  const openEditFor = (item) => {
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleAddCategory = async (name) => {
    try {
      const newCat = await addCategory(name).unwrap();
      notify(`Category "${newCat.name}" created`);
    } catch (err) {
      notify(err.data || err.message || "Failed to create category", "error");
    }
  };

  const handleEditCategory = async (id, newName) => {
    try {
      const updatedCat = await updateCategory({ id, name: newName }).unwrap();
      notify(`Category renamed to "${updatedCat.name}"`);
    } catch (err) {
      notify(err.data || err.message || "Failed to rename category", "error");
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      // Fetch this category's products first so we know which metal-type cache
      // partitions to clear (the delete cascades products across any metal type).
      const affectedVariants = await fetchVariants({ categoryId: id }).unwrap();
      const metalTypes = [...new Set(affectedVariants.map((v) => v.metalType))];
      await deleteCategory({ id, metalTypes }).unwrap();
      if (filterCat === id) setFilterCat("All");
      notify(`Category deleted. All associated items were removed.`, "warning");
    } catch (err) {
      notify(err.data || err.message || "Failed to delete category", "error");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ color: "text.primary", letterSpacing: -0.5 }}
          >
            Jewellery Catalogue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prices dynamically reflect the{" "}
            <strong style={{ color: "goldAccent.text" }}>
              Live Metal Rate
            </strong>
          </Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <Button
            variant="outlined"
            startIcon={<Category />}
            onClick={() => setManageCatOpen(true)}
            sx={{
              fontWeight: 700,
              px: 2,
              py: 1.2,
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
            }}
          >
            Categories
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditItem(null);
              setDialogOpen(true);
            }}
            sx={{ fontWeight: 700, px: 2.5, py: 1.2, borderRadius: 2 }}
          >
            Add Item
          </Button>
        </Box>
      </Box>

      {/* Metal tabs — dynamically built from GET /metal-types, so a newly added metal
          category shows up here automatically without any frontend change.
          flex: 1 with a fixed minWidth evenly spreads them across the full row width,
          wrapping onto a new row (still evenly split) if the viewport gets too narrow. */}
      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        {metalTypeOptions.map((m) => {
          const active = m === activeMetal;
          const rate = rates[m]?.rate;
          const metalColor = getMetalColor(m);
          return (
            <Card
              key={m}
              onClick={() => setActiveMetal(m)}
              sx={{
                flex: "1 1 0",
                minWidth: 150,
                p: 1.5,
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid",
                borderColor: active ? metalColor : "divider",
                bgcolor: active ? `${metalColor}22` : "background.paper",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: metalColor },
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={0.7}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: metalColor,
                    border: "1px solid rgba(0,0,0,0.2)",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  fontSize={13}
                  fontWeight={700}
                  color={active ? "text.primary" : "text.primary"}
                >
                  {formatMetal(m)}
                </Typography>
              </Box>
              <Typography fontSize={11} color="text.secondary">
                {rate ? `₹${rate.toLocaleString()}/g` : "—"}
              </Typography>
            </Card>
          );
        })}
      </Box>

      <Box display="flex" gap={1.5} mb={3} flexWrap="wrap">
        <StatBadge
          label="Total Designs"
          value={stats.total}
          icon={<Category fontSize="small" />}
          color="goldAccent.text"
        />
        <StatBadge
          label="Total Catalogue Weight"
          value={`${stats.totalWeight}g`}
          icon={<Scale fontSize="small" />}
          color="primary.main"
        />
      </Box>

      <Box
        display="flex"
        gap={1.5}
        mb={2.5}
        flexWrap="wrap"
        alignItems="center"
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <TextField
          placeholder="Search by name, code, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: "1 1 220px", minWidth: 180 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            label="Category"
          >
            <MenuItem value="All">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Purity</InputLabel>
          <Select
            value={filterPurity}
            onChange={(e) => setFilterPurity(e.target.value)}
            label="Purity"
          >
            <MenuItem value="All">All</MenuItem>
            {PURITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 32 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>
            <Sort sx={{ fontSize: 14, mr: 0.5 }} /> Sort By
          </InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            label="Sort By"
          >
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="price-desc">Price: High to Low</MenuItem>
            <MenuItem value="price-asc">Price: Low to High</MenuItem>
            <MenuItem value="weight-desc">Weight: High to Low</MenuItem>
            <MenuItem value="weight-asc">Weight: Low to High</MenuItem>
          </Select>
        </FormControl>

        <Box ml="auto" display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            {processedItems.length} of {items.length} items
          </Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
          >
            <ToggleButton value="grid" sx={{ px: 1 }}>
              <GridView sx={{ fontSize: 18 }} />
            </ToggleButton>
            <ToggleButton value="list" sx={{ px: 1 }}>
              <ViewList sx={{ fontSize: 18 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {isLoading ? (
        viewMode === "grid" ? (
          <Box sx={CARD_GRID_SX}>
            {Array.from({ length: 8 }).map((_, i) => (
              <CatalogueCardSkeleton key={i} />
            ))}
          </Box>
        ) : (
          <Box>
            {Array.from({ length: 6 }).map((_, i) => (
              <CatalogueListRowSkeleton key={i} />
            ))}
          </Box>
        )
      ) : isError ? (
        <Box textAlign="center" py={8} color="text.secondary">
          <Typography fontSize={48}>⚠️</Typography>
          <Typography variant="h6" mt={1}>
            Network issue
          </Typography>
          <Typography variant="body2" mb={2}>
            Try again later.
          </Typography>
          <Button variant="outlined" onClick={() => refetchProducts()}>
            Retry
          </Button>
        </Box>
      ) : processedItems.length === 0 ? (
        <Box textAlign="center" py={8} color="text.secondary">
          <Typography fontSize={48}>🔍</Typography>
          <Typography variant="h6" mt={1}>
            No items found
          </Typography>
          <Typography variant="body2">
            Try adjusting your search or filters
          </Typography>
        </Box>
      ) : viewMode === "grid" ? (
        <Box sx={CARD_GRID_SX}>
          {processedItems.map((item) => (
            <CatalogueCard
              key={item.id}
              item={item}
              onEdit={openEditFor}
              onDelete={(i) => setDeleteItem(i)}
              onView={(i) => setViewItem(i)}
            />
          ))}
        </Box>
      ) : (
        <Box>
          {processedItems.map((item) => (
            <CatalogueListRow
              key={item.id}
              item={item}
              onEdit={openEditFor}
              onDelete={(i) => setDeleteItem(i)}
              onView={(i) => setViewItem(i)}
            />
          ))}
        </Box>
      )}

      <ViewDialog
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />
      <ItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveItem}
        initial={editItem}
        existingCodes={[...new Set(items.map((i) => i.code.toUpperCase()))]}
        categories={categories}
        metalTypeOptions={metalTypeOptions}
        defaultMetal={activeMetal}
      />
      <ManageCategoryDialog
        open={manageCatOpen}
        onClose={() => setManageCatOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onEdit={handleEditCategory}
        onDelete={handleDeleteCategory}
      />
      <DeleteDialog
        open={Boolean(deleteItem)}
        item={deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteItemConfirm}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast?.severity || "success"}
          onClose={() => setToast(null)}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
