import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur supports-backdrop-filter:bg-slate-900/70">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <NavLink
            to="https://campus-to-corporate.vercel.app"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <img src="/logo.png" alt="GLA Leaderboard Logo" className="h-10 w-10" />
            <span className="text-lg font-semibold tracking-wide text-slate-50 hidden sm:inline">CareerPrep AI</span>
          </NavLink>
          <div className="hidden md:flex items-center gap-4 text-xs md:text-sm">
            <NavLink
              to="https://campus-to-corporate.vercel.app/leaderboard"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Leaderboard
            </NavLink>
            <NavLink
              to="https://contest.careerprep.tech"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Contests
            </NavLink>
            <NavLink
              to="https://codeanalyser.careerprep.tech"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Code Analyser
            </NavLink>
            <NavLink
              to="https://patterns.careerprep.tech"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Similar Qs
            </NavLink>
            <NavLink
              to="https://notes.careerprep.tech"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Notes
            </NavLink>
            <NavLink
              to="https://interview.careerprep.tech"
              className={({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`}
            >
              Company Sheets
            </NavLink>
          </div>
        </div>
        
      </div>
    </nav>
  );
}
