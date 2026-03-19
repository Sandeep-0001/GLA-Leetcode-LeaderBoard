import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <Routes>
        <Route path="/" element={<LeaderboardPage />} />
      </Routes>
    </div>
  );
}
