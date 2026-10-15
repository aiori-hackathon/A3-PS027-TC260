import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext';
import MainLayout from './layouts/MainLayout';

import DashboardPage from './pages/DashboardPage';
import ScannerPage from './pages/ScannerPage';
import ResultsPage from './pages/ResultsPage';
import DependencyGraphPage from './pages/DependencyGraphPage';
import FailureAnalysisPage from './pages/FailureAnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import ReportsPage from './pages/ReportsPage';
import ControlledTestSitePage from './pages/ControlledTestSitePage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuditProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="scanner" element={<ScannerPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="graph" element={<DependencyGraphPage />} />
            <Route path="failures" element={<FailureAnalysisPage />} />
            <Route path="comparison" element={<ComparisonPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="test-site" element={<ControlledTestSitePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuditProvider>
  );
}
