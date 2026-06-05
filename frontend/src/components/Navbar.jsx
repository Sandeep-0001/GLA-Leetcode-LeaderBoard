import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Home', href: '/', internal: true },
    { name: 'Practice Platform', href: 'https://practice.careerprep.tech' },
    { name: 'Contests', href: 'https://contest.careerprep.tech' },
    { name: 'Resume Tools', href: 'https://resumegenie.careerprep.tech' },
    { name: 'Study Material', href: 'https://interview.careerprep.tech' },
    { name: 'About Us', href: 'https://careerprep.tech/about' },
    { name: 'Login', href: 'https://practice.careerprep.tech/login' }
  ];

  const desktopInternalLinkClass = ({ isActive }) =>
    `relative font-semibold transition-all duration-300 hover:scale-105 transform group whitespace-nowrap ${isActive ? 'text-cyan-400' : 'text-slate-300 hover:text-cyan-400'}`;
  const desktopExternalLinkClass = 'relative text-slate-300 hover:text-cyan-400 font-semibold transition-all duration-300 hover:scale-105 transform group whitespace-nowrap';
  const mobileInternalLinkClass = ({ isActive }) =>
    `relative block px-3 py-2 rounded-md text-base font-semibold transition-all duration-300 hover:scale-105 transform group ${isActive ? 'text-cyan-400' : 'text-slate-300 hover:text-cyan-400'}`;
  const mobileExternalLinkClass = 'relative block px-3 py-2 rounded-md text-base text-slate-300 hover:text-cyan-400 font-semibold transition-all duration-300 hover:scale-105 transform group';

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="shrink-0 flex items-center gap-3">
              <img
                src="/logo.png"
                alt="CareerPrep AI Logo"
                className="h-10 w-10 rounded-lg object-contain"
              />
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">
                <span className="text-white">Career</span>
                <span className="text-cyan-400">Prep AI</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              {navItems.map((item) =>
                item.internal ? (
                  <NavLink key={item.name} to={item.href} className={desktopInternalLinkClass}>
                    {item.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-400 transition-all duration-300 group-hover:w-full"></span>
                  </NavLink>
                ) : (
                  <a key={item.name} href={item.href} className={desktopExternalLinkClass} target="_blank" rel="noopener noreferrer">
                    {item.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-400 transition-all duration-300 group-hover:w-full"></span>
                  </a>
                )
              )}
              <a
                href="https://practice.careerprep.tech/login"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
              >
                Get Started Free
              </a>
            </div>
          </div>

          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded border border-slate-700 text-slate-200 hover:border-cyan-300 hover:text-cyan-300 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="sr-only">Menu</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800/95 backdrop-blur-lg border-t border-slate-700/50">
          <div className="px-2 pt-2 pb-3 space-y-2 sm:px-3">
            {navItems.map((item) =>
              item.internal ? (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileInternalLinkClass}
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-400 transition-all duration-300 group-hover:w-full"></span>
                </NavLink>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={mobileExternalLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-linear-to-r from-cyan-400 to-purple-400 transition-all duration-300 group-hover:w-full"></span>
                </a>
              )
            )}
            <a href="https://practice.careerprep.tech/login" target="_blank" rel="noopener noreferrer" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium mt-2 text-center block">
              Get Started Free
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
