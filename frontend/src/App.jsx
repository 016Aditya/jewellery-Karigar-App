import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { setMetalRates } from "./features/ui/uiSlice";
import Dashboard from "./pages/Dashboard";
import LiveTracking from "./pages/LiveTracking";
import Billing from "./pages/Billing";
import Catalogue from "./pages/Catalogue";
import Karigar from "./pages/Karigar";
import Layout from "./components/Layout";
import FullTimeKarigars from "./pages/FullTimeKarigar";
import KarigarLedger from "./pages/KarigarLedger";
import KarigarLedgerDetail from "./pages/KarigarLedgerDetail";
const API_BASE = "http://localhost:8090/api/metal-rate";

export default function App() {
  const dispatch = useDispatch();

  // Fetch rates for all metal types on App Load
  useEffect(() => {
    const fetchInitialRates = async () => {
      try {
        const res = await fetch(`${API_BASE}/current`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          // data is an array of { metalType, currentRate, percentageChange }
          dispatch(setMetalRates(data));
        } else {
          console.error("Failed to fetch initial metal rates");
        }
      } catch (err) {
        console.error("Network error while fetching metal rates:", err);
      }
    };

    fetchInitialRates();
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tracking" element={<LiveTracking />} />
        <Route path="billing" element={<Billing />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="karigar" element={<Karigar />} />{" "}
        <Route path="karigarManagement" element={<FullTimeKarigars />} />{" "}
        {/* Added Karigar Route */}
        <Route path="karigarLedger" element={<KarigarLedger />} />
        <Route path="karigarLedger/:karigarId" element={<KarigarLedgerDetail />} />
      </Route>
    </Routes>
  );
}
