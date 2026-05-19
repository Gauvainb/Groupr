import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SessionsPage from './pages/SessionsPage';
import AddSessionPage from './pages/AddSessionPage';
import SessionDetailPage from './pages/SessionDetailPage';
import AnalysisPage from './pages/AnalysisPage';
import EquipmentPage from './pages/EquipmentPage';
import AddEquipmentPage from './pages/AddEquipmentPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/new" element={<AddSessionPage />} />
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/new" element={<AddEquipmentPage />} />
      </Routes>
    </HashRouter>
  );
}
