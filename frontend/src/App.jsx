import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-[#07111f] text-white relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute -left-24 top-16 w-[640px] h-[640px] rounded-full blur-3xl float-animation pulse-glow bg-[#0d6b7d]/35"></div>
        <div className="absolute bottom-[-140px] right-[-120px] w-[700px] h-[700px] rounded-full blur-3xl float-animation delay-1000 pulse-glow bg-[#0b1d3d]/80"></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full blur-2xl float-animation bg-[#123b66]/20"></div>
        <div className="absolute top-1/4 right-1/4 w-[260px] h-[260px] rounded-full blur-2xl float-animation delay-500 bg-cyan-400/8"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[220px] h-[220px] rounded-full blur-2xl float-animation delay-1500 bg-sky-400/8"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute inset-0 bg-linear-to-r from-[#0e5f73]/45 via-[#08111f]/10 to-[#07111f]/85"></div>
      </div>
      <Navbar />
      <Routes>
        <Route path="/" element={<LeaderboardPage />} />
      </Routes>
    </div>
  );
}
