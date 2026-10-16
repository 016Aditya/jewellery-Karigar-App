import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 4, overflowY: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
