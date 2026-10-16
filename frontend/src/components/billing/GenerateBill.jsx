import { useState, useEffect, useCallback, useRef } from "react";
import { Box, Typography, Card, Grid, IconButton } from "@mui/material";
import {
  FlightTakeoff,
  Storefront,
  Build,
  Sell,
  Public,
  ArrowBack,
} from "@mui/icons-material";

import DomesticBill from "./DomesticBill";
import ExportBill from "./ExportBill";
import PurchaseBill from "./PurchaseBill";
import RepairBill from "./RepairBill";
import MultiStateBill from "./MultiStateBill";

const CATALOGUE_API_BASE = "http://localhost:8090/api/catalogue";

const ORDER_TYPES = [
  { value: "DOMESTIC", label: "Domestic", icon: Storefront },
  { value: "MULTISTATE", label: "Multi-State", icon: Public },
  { value: "EXPORT", label: "Export", icon: FlightTakeoff },
  { value: "PURCHASE", label: "Buy-back", icon: Sell },
  { value: "REPAIR", label: "Repair", icon: Build },
];

// This component only mounts while the user is actually on the "Generate Bill" screen —
// none of its fetches run while they're just browsing the bill list. Everything it fetches
// is cached in local state for the lifetime of this mount only: switching between the
// Domestic/Export/Purchase/Repair tabs, or between metals/categories inside Domestic, reuses
// what's already been fetched. Leaving this screen (unmounting) and coming back always
// re-fetches fresh, since the cache lives here and not in Redux/localStorage.
export default function GenerateBill({ rates, onBack, onSaveSuccess, notify }) {
  const [orderType, setOrderType] = useState("DOMESTIC");
  const [metalTypeOptions, setMetalTypeOptions] = useState([]);

  const goldRate = rates?.GOLD?.rate || 0;

  // metal -> Category[]
  const categoriesCache = useRef({});
  // "metal|categoryId" -> Product[]
  const productsCache = useRef({});
  // lazy, fetched once, only if the Export tab is actually visited
  const exportCatalogueCache = useRef(null);
  const [exportCatalogue, setExportCatalogue] = useState({
    categories: [],
    products: [],
  });
  const [isLoadingExport, setIsLoadingExport] = useState(false);

  useEffect(() => {
    fetch(`${CATALOGUE_API_BASE}/metal-types`)
      .then((res) => (res.ok ? res.json() : []))
      .then((types) => setMetalTypeOptions(types))
      .catch(() => {});
  }, []);

  const getCategoriesForMetal = useCallback(async (metal) => {
    if (categoriesCache.current[metal]) return categoriesCache.current[metal];
    try {
      const res = await fetch(
        `${CATALOGUE_API_BASE}/categories?metalType=${metal}`,
      );
      const data = res.ok ? await res.json() : [];
      categoriesCache.current[metal] = data;
      return data;
    } catch {
      return [];
    }
  }, []);

  const getProductsForMetalCategory = useCallback(async (metal, categoryId) => {
    const key = `${metal}|${categoryId}`;
    if (productsCache.current[key]) return productsCache.current[key];
    try {
      const res = await fetch(
        `${CATALOGUE_API_BASE}/products?metalType=${metal}&categoryId=${categoryId}`,
      );
      const data = res.ok ? await res.json() : [];
      productsCache.current[key] = data;
      return data;
    } catch {
      return [];
    }
  }, []);

  // Export still wants the full, un-metal-filtered categories+products list (its own logic
  // is untouched) — fetched lazily the first time the Export tab is opened, then cached.
  useEffect(() => {
    if (orderType !== "EXPORT" || exportCatalogueCache.current) return;
    setIsLoadingExport(true);
    Promise.all([
      fetch(`${CATALOGUE_API_BASE}/categories`),
      fetch(`${CATALOGUE_API_BASE}/products`),
    ])
      .then(async ([catRes, prodRes]) => {
        const data = {
          categories: catRes.ok ? await catRes.json() : [],
          products: prodRes.ok ? await prodRes.json() : [],
        };
        exportCatalogueCache.current = data;
        setExportCatalogue(data);
      })
      .catch(() => notify("Failed to load catalogue.", "error"))
      .finally(() => setIsLoadingExport(false));
  }, [orderType, notify]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton
          onClick={onBack}
          sx={{ border: "1px solid", borderColor: "divider" }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight={800} color="text.primary">
          New Transaction
        </Typography>
      </Box>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
            }}
          >
            <Typography
              variant="subtitle2"
              color="primary"
              fontWeight={700}
              mb={2}
            >
              1. TRANSACTION TYPE
            </Typography>

            <Box display="flex" gap={1.5} flexWrap="wrap">
              {ORDER_TYPES.map(({ value, label, icon: Icon }) => {
                const active = value === orderType;
                return (
                  <Card
                    key={value}
                    onClick={() => setOrderType(value)}
                    sx={{
                      flex: "1 1 0",
                      minWidth: 130,
                      p: 1.5,
                      textAlign: "center",
                      cursor: "pointer",
                      border: "2px solid",
                      borderColor: active ? "primary.main" : "divider",
                      bgcolor: active ? "primary.light" : "background.paper",
                      transition: "all 0.15s ease",
                      "&:hover": { borderColor: "primary.main" },
                    }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap={0.7}
                    >
                      <Icon
                        sx={{
                          fontSize: 18,
                          color: active
                            ? "primary.contrastText"
                            : "text.secondary",
                        }}
                      />
                      <Typography
                        fontSize={13}
                        fontWeight={700}
                        color={active ? "primary.contrastText" : "text.primary"}
                      >
                        {label}
                      </Typography>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          </Card>
        </Grid>
      </Grid>
      {orderType === "DOMESTIC" && (
        <DomesticBill
          rates={rates}
          metalTypeOptions={metalTypeOptions}
          getCategoriesForMetal={getCategoriesForMetal}
          getProductsForMetalCategory={getProductsForMetalCategory}
          onSaveSuccess={onSaveSuccess}
          notify={notify}
        />
      )}
      {orderType === "EXPORT" &&
        (isLoadingExport ? null : (
          <ExportBill
            goldRate={goldRate}
            categories={exportCatalogue.categories}
            products={exportCatalogue.products}
            onSaveSuccess={onSaveSuccess}
            notify={notify}
          />
        ))}
      {orderType === "PURCHASE" && (
        <PurchaseBill
          goldRate={goldRate}
          onSaveSuccess={onSaveSuccess}
          notify={notify}
        />
      )}
      {orderType === "REPAIR" && (
        <RepairBill
          goldRate={goldRate}
          onSaveSuccess={onSaveSuccess}
          notify={notify}
        />
      )}
      {orderType === "MULTISTATE" && (
        <MultiStateBill
          goldRate={goldRate}
          onSaveSuccess={onSaveSuccess}
          notify={notify}
        />
      )}
    </Box>
  );
}
