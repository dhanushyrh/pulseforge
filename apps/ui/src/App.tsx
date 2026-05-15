// apps/ui/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import BrowsePage     from './pages/BrowsePage';
import CountryPage    from './pages/CountryPage';

import QueuePage      from './pages/QueuePage';
import SearchPage     from './pages/SearchPage';
import React from 'react';
import CreatorsPage from './components/CreatorsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/browse" replace />} />
          <Route path="/browse"  element={<BrowsePage />} />
          <Route path="/country" element={<CountryPage />} />
          {/* <Route path="/type"    element={<TypePage />} /> */}
          <Route path="/search"  element={<SearchPage />} />
          <Route path="/queue"   element={<QueuePage />} />

          <Route path="/creators" element={<CreatorsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}