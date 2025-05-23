import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScanPage from "./pages/ScanPage";
import Dashboard from "./pages/Dashboard";
import ManualSync from "./pages/ManualSync";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sync" element={<ManualSync />} />
        <Route path="*" element={<ScanPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
