import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Box, Button, IconButton, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ArrowBack, FileDownload, Add } from "@mui/icons-material";
import {
  useGetFullTimeKarigarsQuery,
  useGetKarigarLedgerPuritiesQuery,
  useGetKarigarLedgerEntriesQuery,
  useGetKarigarLedgerAccountTotalsQuery,
  useAddKarigarLedgerEntryMutation,
} from "../features/api/apiSlice";
import { getMetalColor } from "../utils/metalColors";
import KarigarMetalCard from "../components/Karigar/KarigarMetalCard";
import KarigarLedgerTable from "../components/Karigar/KarigarLedgerTable";
import KarigarLedgerEntryForm from "../components/Karigar/KarigarLedgerEntryForm";
import KarigarLedgerSettlementCard from "../components/Karigar/KarigarLedgerSettlementCard";
import KarigarLedgerExportFilterDialog from "../components/Karigar/KarigarLedgerExportFilterDialog";
import KarigarLedgerExportProgressDialog from "../components/Karigar/KarigarLedgerExportProgressDialog";
import {
  API_BASE_URL,
  ASSET_CLASSES,
  EMPTY_FORM,
  EXPORT_STEPS,
  TOLERANCE,
  buildLedgerRows,
  toIsoDate,
} from "../components/Karigar/karigarLedgerUtils";

export default function KarigarLedgerDetail() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { karigarId } = useParams();
  const idNum = Number(karigarId);

  const { data: karigars = [] } = useGetFullTimeKarigarsQuery();
  const karigar = karigars.find((k) => k.id === idNum);

  const { data: entries = [], isLoading } = useGetKarigarLedgerEntriesQuery(idNum, {
    skip: !idNum,
    refetchOnMountOrArgChange: true,
  });
  // Absolute, DB-computed balance/OUT/IN totals — the entries list above is windowed to
  // the last 3 months for display, but every balance figure on this screen must reflect
  // the karigar's true all-time ledger, so it's sourced from this separate endpoint.
  const { data: totals = [] } = useGetKarigarLedgerAccountTotalsQuery(idNum, {
    skip: !idNum,
    refetchOnMountOrArgChange: true,
  });
  const { data: purities = [] } = useGetKarigarLedgerPuritiesQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [addEntry, { isLoading: isSaving }] = useAddKarigarLedgerEntryMutation();

  const [activeCat, setActiveCat] = useState("GOLD");
  const [viewMode, setViewMode] = useState("merged"); // "merged" | "split"
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("ISSUE"); // ISSUE = OUT, RETURN = IN
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Export flow: a date-range filter dialog, then a progress modal that stays open until
  // the backend-generated Excel file has actually finished downloading.
  const [exportFilterOpen, setExportFilterOpen] = useState(false);
  const [exportRange, setExportRange] = useState({ start: "", end: "" });
  const [exportRangeError, setExportRangeError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState("running"); // running | success | error
  const [exportStepIndex, setExportStepIndex] = useState(0);
  const [exportErrorMsg, setExportErrorMsg] = useState("");
  const exportTimersRef = useRef([]);

  const clearExportTimers = () => {
    exportTimersRef.current.forEach((t) => clearTimeout(t));
    exportTimersRef.current = [];
  };
  useEffect(() => clearExportTimers, []);

  const catPurities = useMemo(
    () => purities.filter((p) => p.assetClass === activeCat),
    [purities, activeCat],
  );

  const catEntries = useMemo(
    () => entries.filter((e) => e.assetClass === activeCat),
    [entries, activeCat],
  );

  const totalsByClass = useMemo(() => {
    const map = { GOLD: null, SILVER: null, PLATINUM: null };
    totals.forEach((t) => {
      map[t.assetClass] = t;
    });
    return map;
  }, [totals]);

  // Absolute, DB-computed figures for the active metal — never derived from the (windowed)
  // entries list, so these stay correct even once older transactions scroll out of the
  // 3-month display window.
  const activeTotals = totalsByClass[activeCat];
  const outFine = Number(activeTotals?.totalIssuedFine ?? 0);
  const inFine = Number(activeTotals?.totalReturnedFine ?? 0);
  const balance = Number(activeTotals?.fineBalance ?? 0);
  const isSettled = Math.abs(balance) <= TOLERANCE;

  const balancesByClass = useMemo(
    () => ({
      GOLD: Number(totalsByClass.GOLD?.fineBalance ?? 0),
      SILVER: Number(totalsByClass.SILVER?.fineBalance ?? 0),
      PLATINUM: Number(totalsByClass.PLATINUM?.fineBalance ?? 0),
    }),
    [totalsByClass],
  );

  // The visible (windowed) entries only cover the last 3 months, so their own net delta
  // won't match the absolute balance on its own — back-compute the balance that existed
  // just before the oldest visible entry so the running-balance column still lands
  // exactly on the true, DB-authoritative balance for the most recent row.
  const openingBalance = useMemo(() => {
    const visibleNetDelta = catEntries.reduce(
      (s, e) =>
        s + (e.entryType === "ISSUE" ? Number(e.fineWeight) : -Number(e.fineWeight)),
      0,
    );
    return balance - visibleNetDelta;
  }, [catEntries, balance]);

  const ledgerRows = useMemo(
    () => buildLedgerRows(catEntries, openingBalance),
    [catEntries, openingBalance],
  );

  // Split view — ISSUE rows (OUT) and everything else (IN). Both tables render the exact
  // same KarigarLedgerTable component with the exact same columns as the merged view —
  // only the row set passed in differs.
  const outRows = useMemo(() => ledgerRows.filter((e) => e.entryType === "ISSUE"), [ledgerRows]);
  const inRows = useMemo(() => ledgerRows.filter((e) => e.entryType !== "ISSUE"), [ledgerRows]);

  const shortLabel = { GOLD: "FG", SILVER: "FS", PLATINUM: "FP" }[activeCat];
  const metalColor = getMetalColor(activeCat);
  const activeMetalLabel = ASSET_CLASSES.find((c) => c.value === activeCat)?.label || "Metal";

  const openForm = (type) => {
    setFormType(type);
    setFormError("");
    setForm({ ...EMPTY_FORM, purity: catPurities[0]?.key || "" });
    setShowForm(true);
  };

  const handleSubmitEntry = async () => {
    if (!form.grossWeight || parseFloat(form.grossWeight) <= 0) {
      setFormError("Enter a valid weight greater than 0");
      return;
    }
    if (!form.purity) {
      setFormError("Select a purity");
      return;
    }
    if (!form.description.trim()) {
      setFormError("A description is required for every entry");
      return;
    }
    try {
      await addEntry({
        karigarId: idNum,
        entryType: formType,
        purity: form.purity,
        grossWeight: parseFloat(form.grossWeight),
        jobCard: form.jobCard || null,
        description: form.description,
      }).unwrap();
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err?.data?.message || "Failed to save this entry.");
    }
  };

  const reverseSettlement = (needFine, purityKey) => {
    const opt = purities.find((p) => p.key === purityKey);
    if (!opt) return 0;
    return needFine / Number(opt.factor);
  };

  // ── Export Excel — server-generated, full (unwindowed) transaction log for a chosen
  // date range. Opens a filter dialog first, then a step-by-step progress modal that stays
  // open until the file has actually finished downloading.
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const openExportFilter = () => {
    setExportRangeError("");
    setExportRange({ start: toIsoDate(threeMonthsAgo), end: toIsoDate(today) });
    setExportFilterOpen(true);
  };

  const applyQuickRange = (months) => {
    const start = new Date(today);
    start.setMonth(start.getMonth() - months);
    setExportRange({ start: toIsoDate(start), end: toIsoDate(today) });
    setExportRangeError("");
  };

  const runExport = (start, end) => {
    clearExportTimers();
    setExportStatus("running");
    setExportStepIndex(0);
    setExportErrorMsg("");
    setExportOpen(true);

    const STEP_DELAY = 650;
    const timers = EXPORT_STEPS.slice(0, -1).map((_, i) =>
      setTimeout(() => setExportStepIndex(i + 1), STEP_DELAY * (i + 1)),
    );
    exportTimersRef.current = timers;

    const doDownload = async () => {
      try {
        const url =
          `${API_BASE_URL}/karigar-ledger/accounts/${idNum}/export` +
          `?assetClass=${activeCat}&startDate=${start}&endDate=${end}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Export request failed");
        const blob = await res.blob();

        const safeName = (karigar?.name || String(idNum)).replace(/[^a-zA-Z0-9]+/g, "-");
        const filename = `karigar-ledger-${safeName}-${activeCat}-${start}-to-${end}.xlsx`;

        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);

        setExportStatus("success");
      } catch (err) {
        setExportErrorMsg("Could not generate the export. Please try again.");
        setExportStatus("error");
      }
    };

    // The final step ("Finalising & downloading") is tied to the real network round trip —
    // it only advances once the file has actually been fetched, same pattern as the
    // Advance-Stage / vibe-coding modals elsewhere in the app.
    const finalTimer = setTimeout(() => {
      setExportStepIndex(EXPORT_STEPS.length - 1);
      doDownload();
    }, STEP_DELAY * EXPORT_STEPS.length);
    exportTimersRef.current.push(finalTimer);
  };

  const handleConfirmExportRange = () => {
    if (!exportRange.start || !exportRange.end) {
      setExportRangeError("Select both a start and end date");
      return;
    }
    if (exportRange.start > exportRange.end) {
      setExportRangeError("Start date must be before the end date");
      return;
    }
    setExportFilterOpen(false);
    runExport(exportRange.start, exportRange.end);
  };

  const handleExportRetry = () => runExport(exportRange.start, exportRange.end);
  const handleExportClose = () => {
    clearExportTimers();
    setExportOpen(false);
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        background: theme.palette.background.default,
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        <IconButton
          onClick={() => navigate("/karigarLedger")}
          sx={{ border: `1px solid ${theme.palette.divider}` }}
        >
          <ArrowBack />
        </IconButton>
        <Avatar sx={{ width: 48, height: 48, fontWeight: 800, fontSize: 20 }}>
          {karigar?.name?.[0]?.toUpperCase()}
        </Avatar>
        <Box flex={1} minWidth={200}>
          <Typography variant="h4" fontWeight={800} sx={{ fontFamily: "Georgia, serif", letterSpacing: "-0.01em" }}>
            {karigar?.name || "Karigar"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gold Ledger — every issue and return, by asset class
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={openExportFilter}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          Export Excel
        </Button>
      </Box>

      <Box>
        {/* Metal selector — evenly spread across the header, like the catalogue metal tabs */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          {ASSET_CLASSES.map((c) => (
            <KarigarMetalCard
              key={c.value}
              metal={c}
              active={activeCat === c.value}
              balance={balancesByClass[c.value]}
              onClick={() => setActiveCat(c.value)}
            />
          ))}
        </Box>

        {/* Add entry actions */}
        <Box display="flex" gap={1.5} mb={showForm ? 2.5 : 4} flexWrap="wrap">
          <Button
            variant="contained"
            color="warning"
            startIcon={<Add />}
            onClick={() => openForm("ISSUE")}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            Add {activeMetalLabel} Issued (OUT)
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Add />}
            onClick={() => openForm("RETURN")}
            sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
          >
            Add {activeMetalLabel} Returned (IN)
          </Button>
        </Box>

        {showForm && (
          <KarigarLedgerEntryForm
            formType={formType}
            activeMetalLabel={activeMetalLabel}
            form={form}
            setForm={setForm}
            catPurities={catPurities}
            formError={formError}
            isSaving={isSaving}
            onCancel={() => setShowForm(false)}
            onSubmit={handleSubmitEntry}
          />
        )}

        {/* Ledger view toggle — merged (default) shows one chronological table;
            split shows separate OUT / IN tables side by side, sharing the exact same
            columns/design as the merged table (only the row set differs). */}
        <Box display="flex" justifyContent="flex-end" mb={1.5}>
          <Box sx={{ display: "inline-flex", border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: "hidden" }}>
            <Button
              size="small"
              onClick={() => setViewMode("merged")}
              variant={viewMode === "merged" ? "contained" : "text"}
              sx={{ borderRadius: 0, fontWeight: 700, px: 2, ...(viewMode !== "merged" && { color: "text.secondary" }) }}
            >
              Merged View
            </Button>
            <Button
              size="small"
              onClick={() => setViewMode("split")}
              variant={viewMode === "split" ? "contained" : "text"}
              sx={{ borderRadius: 0, fontWeight: 700, px: 2, ...(viewMode !== "split" && { color: "text.secondary" }) }}
            >
              Split OUT / IN
            </Button>
          </Box>
        </Box>

        {viewMode === "merged" ? (
          <Box mb={4}>
            <KarigarLedgerTable
              rows={ledgerRows}
              title={`${activeMetalLabel} Ledger`}
              subtitle="Complete chronological transaction history for this asset class"
              isLoading={isLoading}
              purities={purities}
              shortLabel={shortLabel}
              metalColor={metalColor}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: { xs: "wrap", lg: "nowrap" },
              gap: 3,
              width: "100%",
              mb: 4,
              alignItems: "stretch",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <KarigarLedgerTable
                rows={outRows}
                title={`${activeMetalLabel} Issued (OUT)`}
                subtitle="Metal dispatched to this karigar"
                isLoading={isLoading}
                purities={purities}
                shortLabel={shortLabel}
                metalColor={metalColor}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <KarigarLedgerTable
                rows={inRows}
                title={`${activeMetalLabel} Returned (IN)`}
                subtitle="Metal received back — finished, scrap, or job-committed"
                isLoading={isLoading}
                purities={purities}
                shortLabel={shortLabel}
                metalColor={metalColor}
              />
            </Box>
          </Box>
        )}

        <KarigarLedgerSettlementCard
          activeMetalLabel={activeMetalLabel}
          outFine={outFine}
          inFine={inFine}
          balance={balance}
          isSettled={isSettled}
          shortLabel={shortLabel}
          metalColor={metalColor}
          catPurities={catPurities}
          reverseSettlement={reverseSettlement}
        />
      </Box>

      <KarigarLedgerExportFilterDialog
        open={exportFilterOpen}
        onClose={() => setExportFilterOpen(false)}
        activeMetalLabel={activeMetalLabel}
        exportRange={exportRange}
        setExportRange={setExportRange}
        exportRangeError={exportRangeError}
        onApplyQuickRange={applyQuickRange}
        onConfirm={handleConfirmExportRange}
      />

      <KarigarLedgerExportProgressDialog
        open={exportOpen}
        status={exportStatus}
        stepIndex={exportStepIndex}
        errorMsg={exportErrorMsg}
        onClose={handleExportClose}
        onRetry={handleExportRetry}
      />
    </Box>
  );
}
