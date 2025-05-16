import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScanPage from "./ScanPage";
import DashboardPage from "./Dashboard";
import ManualSync from "./ManualSync"; // <-- Import the new page

export default function App() {
  return (
    <BrowserRouter>
      <div className="p-4 max-w-md mx-auto">
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sync" element={<ManualSync />} /> {/* Add new route */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
