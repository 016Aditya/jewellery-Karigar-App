import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { mockCatalogue } from "./mockDb";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Every metal type the backend currently supports. Used only as a fallback so a category
// delete (which can cascade across any metal) has something to invalidate before the
// dynamic /metal-types list has loaded.
export const ALL_METAL_TYPES = [
  "GOLD",
  "SILVER",
  "PLATINUM",
  "WHITE_GOLD",
  "ROSE_GOLD",
  "YELLOW_GOLD",
];

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8090/api" }),
  tagTypes: [
    "DashboardStats",
    "TopSellingItems",
    "Tracking",
    "Bills",
    "Catalogue",
    "Karigar",
    "FullTimeKarigar",
    "CategoryList",
    "MetalTypeList",
    "CatalogueProducts",
    "KarigarLedgerAccounts",
    "KarigarLedgerEntries",
  ],
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: (refresh = false) => `/dashboard/stats${refresh ? "?refresh=true" : ""}`,
      providesTags: ["DashboardStats"],
    }),

    getTrackings: builder.query({
      query: () => "/tracking",
      providesTags: ["Tracking"],
    }),

    updateTrackingStatus: builder.mutation({
      query: ({ itemId, ...patch }) => ({
        url: `/tracking/${itemId}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Tracking"],
    }),

    getBills: builder.query({
      query: (orderType) => {
        if (orderType && orderType !== "ALL") {
          return `/bills?orderType=${orderType}`;
        }
        return "/bills";
      },
      providesTags: ["Bills"],
    }),

    // Single-order lookup — used wherever we only need one specific bill/order (e.g. the
    // Karigar job assignment modal), so we never have to pull the entire bills list just
    // to find one order by ID.
    getBillById: builder.query({
      query: (billId) => `/bills/${billId}`,
      providesTags: (result, error, billId) => [{ type: "Bills", id: billId }],
    }),

    addBill: builder.mutation({
      query: (newBill) => ({
        url: "/bills",
        method: "POST",
        body: newBill,
      }),
      invalidatesTags: ["Bills", "Tracking"],
    }),

    getBillPdf: builder.query({
      query: (id) => ({
        url: `/bills/${id}/pdf`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    getKarigarJobs: builder.query({
      query: () => "/karigar",
      providesTags: ["Karigar"],
    }),

    assignKarigarJob: builder.mutation({
      query: (newJob) => ({
        url: "/karigar",
        method: "POST",
        body: newJob,
      }),
      invalidatesTags: ["Karigar"],
    }),

    receiveKarigarJob: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/karigar/${id}/receive`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["Karigar"],
    }),

    // ── Full-Time Karigar CRUD ──────────────────────────────────────────────

    getFullTimeKarigars: builder.query({
      query: () => "/full-time-karigars",
      providesTags: ["FullTimeKarigar"],
    }),

    createFullTimeKarigar: builder.mutation({
      query: (newKarigar) => ({
        url: "/full-time-karigars",
        method: "POST",
        body: newKarigar,
      }),
      invalidatesTags: ["FullTimeKarigar"],
    }),

    updateFullTimeKarigar: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/full-time-karigars/${id}`,
        method: "PUT",
        body: patch,
      }),
      invalidatesTags: ["FullTimeKarigar"],
    }),

    deleteFullTimeKarigar: builder.mutation({
      query: (id) => ({
        url: `/full-time-karigars/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FullTimeKarigar"],
    }),

    // ── Karigar Gold Ledger ──────────────────────────────────────────────────
    // keepUnusedDataFor: 0 — this data drives real-money balances, so the UI must
    // never show a stale cached read; every mount/arg-change hits the API fresh.
    getKarigarLedgerPurities: builder.query({
      query: () => "/karigar-ledger/purities",
      keepUnusedDataFor: 0,
    }),

    getKarigarLedgerAccounts: builder.query({
      query: () => "/karigar-ledger/accounts",
      providesTags: ["KarigarLedgerAccounts"],
      keepUnusedDataFor: 0,
    }),

    getKarigarLedgerEntries: builder.query({
      query: (karigarId) => `/karigar-ledger/accounts/${karigarId}/entries`,
      providesTags: (result, error, karigarId) => [
        { type: "KarigarLedgerEntries", id: karigarId },
      ],
      keepUnusedDataFor: 0,
    }),

    // Absolute, all-time balance/OUT/IN totals — DB-computed, independent of the 3-month
    // window getKarigarLedgerEntries above is scoped to for display.
    getKarigarLedgerAccountTotals: builder.query({
      query: (karigarId) => `/karigar-ledger/accounts/${karigarId}/totals`,
      providesTags: (result, error, karigarId) => [
        { type: "KarigarLedgerEntries", id: karigarId },
        "KarigarLedgerAccounts",
      ],
      keepUnusedDataFor: 0,
    }),

    addKarigarLedgerEntry: builder.mutation({
      query: ({ karigarId, ...patch }) => ({
        url: `/karigar-ledger/accounts/${karigarId}/entries`,
        method: "POST",
        body: patch,
      }),
      // A new entry changes both this karigar's transaction history and every karigar's
      // holdings summary (since the balance changed).
      invalidatesTags: (result, error, { karigarId }) => [
        "KarigarLedgerAccounts",
        { type: "KarigarLedgerEntries", id: karigarId },
      ],
    }),

    deleteKarigarLedgerEntry: builder.mutation({
      query: ({ karigarId, entryId }) => ({
        url: `/karigar-ledger/accounts/${karigarId}/entries/${entryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { karigarId }) => [
        "KarigarLedgerAccounts",
        { type: "KarigarLedgerEntries", id: karigarId },
      ],
    }),

    // ──────────────────────────────────────────────────────────────────────

    getCatalogue: builder.query({
      queryFn: async () => {
        await delay(300);
        return { data: [...mockCatalogue] };
      },
      providesTags: ["Catalogue"],
    }),

    addCatalogueItem: builder.mutation({
      queryFn: async (newItem) => {
        await delay(300);
        mockCatalogue.push(newItem);
        return { data: newItem };
      },
      invalidatesTags: ["Catalogue"],
    }),

    // ── Real catalogue (categories / metal types / products) ────────────────
    // Cached via RTK Query so the same metal tab isn't re-fetched from the DB on every
    // render; explicitly invalidated (scoped to the affected metal types) on writes below.

    getCategories: builder.query({
      query: () => "/catalogue/categories",
      providesTags: ["CategoryList"],
    }),

    getMetalTypes: builder.query({
      query: () => "/catalogue/metal-types",
      providesTags: ["MetalTypeList"],
    }),

    getCatalogueProducts: builder.query({
      query: ({ metalType, categoryId, productId } = {}) => {
        const params = new URLSearchParams();
        if (metalType) params.append("metalType", metalType);
        if (categoryId && categoryId !== "All") params.append("categoryId", categoryId);
        if (productId) params.append("productId", productId);
        return `/catalogue/products?${params.toString()}`;
      },
      // Cache is partitioned per metal type, so switching tabs reuses previously
      // fetched data instead of hitting the DB again.
      providesTags: (result, error, arg) => [
        { type: "CatalogueProducts", id: arg?.metalType || "ALL" },
      ],
    }),

    addCategory: builder.mutation({
      query: (name) => ({
        url: "/catalogue/categories",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["CategoryList"],
    }),

    updateCategory: builder.mutation({
      query: ({ id, name }) => ({
        url: `/catalogue/categories/${id}`,
        method: "PUT",
        body: { name },
      }),
      invalidatesTags: ["CategoryList"],
    }),

    deleteCategory: builder.mutation({
      // metalTypes = every metal type currently known to the UI, since deleting a
      // category cascades product deletes across whichever metals those products had.
      query: ({ id }) => ({
        url: `/catalogue/categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { metalTypes = ALL_METAL_TYPES } = {}) => [
        "CategoryList",
        ...metalTypes.map((m) => ({ type: "CatalogueProducts", id: m })),
      ],
    }),

    addProduct: builder.mutation({
      query: (body) => ({
        url: "/catalogue/products",
        method: "POST",
        body,
      }),
      // Only the metal types actually submitted for this product need to be refetched
      invalidatesTags: (result, error, body) =>
        (body.metalTypes || []).map((m) => ({ type: "CatalogueProducts", id: m })),
    }),

    updateProduct: builder.mutation({
      query: ({ id, previousMetalTypes, ...body }) => ({
        url: `/catalogue/products/${id}`,
        method: "PUT",
        body,
      }),
      // Clear both the metal types it had before *and* after the edit (a variant may
      // have been added or removed), scoped to just those, not the whole cache.
      invalidatesTags: (result, error, { metalTypes = [], previousMetalTypes = [] }) => {
        const affected = new Set([...metalTypes, ...previousMetalTypes]);
        return [...affected].map((m) => ({ type: "CatalogueProducts", id: m }));
      },
    }),

    deleteProduct: builder.mutation({
      query: ({ id }) => ({
        url: `/catalogue/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { metalTypes = [] }) =>
        metalTypes.map((m) => ({ type: "CatalogueProducts", id: m })),
    }),

    // ── Charts ───────────────────────────────────────────────────────────────
    getKarigarJobVolume: builder.query({
      query: ({ year, month } = {}) => {
        const params = new URLSearchParams();
        if (year) params.append("year", year);
        if (month) params.append("month", month);
        return `/charts/karigar-job-volume?${params.toString()}`;
      },
      providesTags: ["KarigarJobVolume"],
    }),

    getMetalWeightVsReturn: builder.query({
      query: ({ startDate, endDate, metalType, karigarType } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (metalType) params.append("metalType", metalType);
        if (karigarType) params.append("karigarType", karigarType);
        return `/charts/metal-weight-vs-return?${params.toString()}`;
      },
      providesTags: ["MetalWeightVsReturn"],
    }),

    getGhataTrend: builder.query({
      query: ({ startDate, endDate, karigarName, metalType } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigarName) params.append("karigarName", karigarName);
        if (metalType) params.append("metalType", metalType);
        return `/charts/ghata-trend?${params.toString()}`;
      },
      providesTags: ["GhataTrend"],
    }),

    getTurnaroundTime: builder.query({
      query: ({ startDate, endDate, targetTatDays } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (targetTatDays) params.append("targetTatDays", targetTatDays);
        return `/charts/turnaround-time?${params.toString()}`;
      },
      providesTags: ["TurnaroundTime"],
    }),

    // Karigar lookup dropdown
    getKarigarLookup: builder.query({
      query: () => `/charts/karigar-lookup`,
      providesTags: ["KarigarLookup"],
    }),

    // Radar data — karigars sent as comma-separated string
    getProductivityScore: builder.query({
      query: ({ karigars = [], startDate, endDate, targetTat } = {}) => {
        const params = new URLSearchParams();
        params.append("karigars", karigars.join(","));
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (targetTat) params.append("targetTat", targetTat);
        return `/charts/productivity-score?${params.toString()}`;
      },
      providesTags: ["ProductivityScore"],
    }),

    getWagePayoutProfitability: builder.query({
      query: ({ startDate, endDate, karigarType } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigarType) params.append("karigarType", karigarType);
        return `/charts/wage-payout-profitability?${params.toString()}`;
      },
      providesTags: ["WagePayoutProfitability"],
    }),

    getWagePerGram: builder.query({
      query: ({ startDate, endDate, karigarType, targetWage } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigarType) params.append("karigarType", karigarType);
        if (targetWage) params.append("targetWage", targetWage);
        return `/charts/wage-per-gram?${params.toString()}`;
      },
      providesTags: ["WagePerGram"],
    }),

    getWagesVsValue: builder.query({
      query: ({ startDate, endDate, karigarType } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigarType) params.append("karigarType", karigarType);
        return `/charts/wages-vs-value?${params.toString()}`;
      },
      providesTags: ["WagesVsValue"],
    }),

    getAdvanceBalanceLedger: builder.query({
      query: ({ startDate, endDate, karigarType } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigarType) params.append("karigarType", karigarType);
        return `/charts/advance-balance-ledger?${params.toString()}`;
      },
      providesTags: ["AdvanceBalanceLedger"],
    }),

    getWageTrend: builder.query({
      query: ({ startDate, endDate, karigars } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (karigars && karigars.length > 0) {
          params.append("karigars", karigars.join(","));
        }
        return `/charts/wage-trend?${params.toString()}`;
      },
      providesTags: ["WageTrend"],
    }),

    getTopSellingItems: builder.query({
      query: () => "/charts/top-selling-items",
      providesTags: ["TopSellingItems"],
    }),

    refreshChartCache: builder.mutation({
      query: () => ({ url: "/charts/refresh-cache", method: "POST" }),
      invalidatesTags: [
        "KarigarJobVolume",
        "MetalWeightVsReturn",
        "GhataTrend",
        "TurnaroundTime",
        "ProductivityScore",
        "WagePayoutProfitability",
        "WagePerGram",
        "WagesVsValue",
        "AdvanceBalanceLedger",
        "WageTrend",
        "TopSellingItems",
      ],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useRefreshChartCacheMutation,
  useLazyGetDashboardStatsQuery,
  useGetTopSellingItemsQuery,
  useGetTrackingsQuery,
  useUpdateTrackingStatusMutation,
  useGetBillsQuery,
  useLazyGetBillByIdQuery,
  useAddBillMutation,
  useLazyGetBillPdfQuery,
  useGetKarigarJobsQuery,
  useAssignKarigarJobMutation,
  useReceiveKarigarJobMutation,
  useGetFullTimeKarigarsQuery,
  useCreateFullTimeKarigarMutation,
  useUpdateFullTimeKarigarMutation,
  useDeleteFullTimeKarigarMutation,
  useGetKarigarLedgerPuritiesQuery,
  useGetKarigarLedgerAccountsQuery,
  useGetKarigarLedgerEntriesQuery,
  useGetKarigarLedgerAccountTotalsQuery,
  useAddKarigarLedgerEntryMutation,
  useDeleteKarigarLedgerEntryMutation,
  useGetCatalogueQuery,
  useAddCatalogueItemMutation,
  useGetKarigarJobVolumeQuery,
  useGetMetalWeightVsReturnQuery,
  useGetGhataTrendQuery,
  useGetTurnaroundTimeQuery,
  useGetKarigarLookupQuery,
  useGetProductivityScoreQuery,
  useGetWagePayoutProfitabilityQuery,
  useGetWagePerGramQuery,
  useGetWagesVsValueQuery,
  useGetAdvanceBalanceLedgerQuery,
  useGetWageTrendQuery,
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
} = apiSlice;
