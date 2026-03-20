import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Leaderboard', to: 'https://leaderboard.careerprep.tech' },
    { label: 'Contests', to: 'https://contest.careerprep.tech' },
    { label: 'Code Analyser', to: 'https://codeanalyser.careerprep.tech' },
    { label: 'Similar Qs', to: 'https://patterns.careerprep.tech' },
    { label: 'Notes', to: 'https://notes.careerprep.tech' },
    { label: 'Company Sheets', to: 'https://interview.careerprep.tech' }
  ];

  const navLinkClass = ({ isActive }) => `transition-colors ${isActive ? 'text-cyan-300' : 'text-slate-300 hover:text-cyan-300'}`;

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
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded border border-slate-700 text-slate-200 hover:border-cyan-300 hover:text-cyan-300 transition-colors"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          <span className="sr-only">Menu</span>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {isMobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 px-4 py-3">
          <div className="flex flex-col gap-3 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={navLinkClass}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
