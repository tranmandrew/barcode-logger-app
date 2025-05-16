import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScanPage from "./ScanPage";
import DashboardPage from "./Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <div className="p-4 max-w-md mx-auto">
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
