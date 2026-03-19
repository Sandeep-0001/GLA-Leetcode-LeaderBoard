import React, { useEffect, useState } from 'react';
import { getLeaderboard, getSections, refreshAll as refreshAllApi, refreshStudentStats } from '../services/api';
import FileUpload from '../components/FileUpload.jsx';
import Leaderboard from '../components/Leaderboard.jsx';

// SEO utility function
const updatePageMeta = (title, description) => {
  document.title = title;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
};

export default function LeaderboardPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState('2'); // '' | 2 | 3 | 4
  const [sectionFilter, setSectionFilter] = useState(''); // A | B | C | ... or empty
  const [sectionOptions, setSectionOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshAllLoading, setRefreshAllLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Update meta tags when filters change
  useEffect(() => {
    const yearLabel = { '2': '2nd Year', '3': '3rd Year', '4': '4th Year' }[yearFilter] || '';
    const sectionLabel = sectionFilter ? ` - Section ${sectionFilter}` : '';
    const title = yearLabel
      ? `GLA ${yearLabel} LeetCode Leaderboard${sectionLabel} | GLA Rankings`
      : `GLA LeetCode Leaderboard${sectionLabel} | GLA Rankings`;
    const description = yearLabel
      ? `GLA LeetCode Leaderboard: View ${yearLabel}${sectionLabel} competitive programming rankings. Track student LeetCode progress and coding performance - CareerPrep powered.`
      : `GLA LeetCode Leaderboard: View all students${sectionLabel} competitive programming rankings. Track student LeetCode progress and coding performance - CareerPrep powered.`;
    updatePageMeta(title, description);
  }, [yearFilter, sectionFilter]);

  const load = async ({ nextPage } = {}) => {
    setLoading(true);
    try {
      const isAll = Number(limit) >= 10_000;
      const targetPage = isAll ? 1 : (nextPage || page);
      const res = await getLeaderboard({ year: yearFilter, section: sectionFilter, page: targetPage, limit, q: searchQuery.trim() });
      setData(res?.data || []);
      setTotal(Number(res?.total) || 0);
      setTotalPages(Math.max(1, Math.ceil((Number(res?.total) || 0) / limit)));
      setPage(Number(res?.page) || targetPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter, sectionFilter]);

  useEffect(() => {
    let mounted = true;
    const loadSections = async () => {
      try {
        const res = await getSections(yearFilter);
        const options = Array.isArray(res?.data) ? res.data : [];
        if (!mounted) return;
        setSectionOptions(options);
        if (sectionFilter && !options.includes(sectionFilter)) {
          setSectionFilter('');
        }
      } catch (_) {
        if (mounted) setSectionOptions([]);
      }
    };
    loadSections();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearFilter]);

  useEffect(() => {
    setPage(1);
    load({ nextPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load({ nextPage: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleUpload = async () => {
    await load({ nextPage: 1 });
  };

  const handleRefreshAll = () => {
    setRefreshAllLoading(true);
    try {
      refreshAllApi().catch(() => {});
    } catch (_) {
      // ignore
    }
    setTimeout(() => {
      load({ nextPage: 1 }).finally(() => setRefreshAllLoading(false));
    }, 5000);
  };

  const handleRefreshStudent = async (id) => {
    if (!id) return;
    try {
      await refreshStudentStats(id);
    } catch (_) {
      // ignore errors here; backend already keeps existing stats on failure
    }
    await load({ nextPage: page });
  };

  const filteredData = data;

  const totals = {
    students: total,
    solved: filteredData.reduce((a, b) => a + (Number(b.totalSolved) || 0), 0),
    ratingAvg: (() => {
      const ratings = filteredData.map((s) => Number(s.contestRating)).filter((n) => !Number.isNaN(n));
      if (!ratings.length) return 0;
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      return Math.round(avg);
    })(),
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <header className="border-b border-slate-700/70 bg-linear-to-b from-slate-900 to-slate-800/40">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">GLA LeetCode Leaderboard</h1>
              <p className="text-sm md:text-base text-slate-300 mt-1">Track LeetCode progress, competitive rankings, and problem-solving performance across all GLA students.</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Year</span>
                <select
                  id="yearFilter"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                >
                  <option value="">All Years</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Section</span>
                <select
                  id="sectionFilter"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="w-40 bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  aria-label="Filter by section"
                >
                  <option value="">All Sections</option>
                  {sectionOptions.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-64 bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 placeholder:text-slate-400"
                aria-label="Search by name"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Year</span>
            <select
              id="yearFilter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 w-full"
            >
              <option value="">All Years</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Section</span>
            <select
              id="sectionFilter"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              aria-label="Filter by section"
            >
              <option value="">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 placeholder:text-slate-400"
            aria-label="Search by name"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Students</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums">{totals.students}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Total Solved</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums">{totals.solved}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
            <div className="text-sm text-slate-400">Avg Contest Rating</div>
            <div className="text-2xl font-semibold mt-1 tabular-nums">{totals.ratingAvg}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={handleRefreshAll}
                disabled={refreshAllLoading}
                className={`px-3 py-1.5 rounded-md border border-transparent inline-flex items-center gap-2 ${
                  refreshAllLoading
                    ? 'bg-emerald-500/30 text-emerald-100 animate-pulse cursor-default'
                    : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                }`}
                title="Refresh all students' LeetCode stats in background"
              >
                {refreshAllLoading ? 'Refreshing…' : 'Refresh All'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Page <span className="tabular-nums">{page}</span> / <span className="tabular-nums">{totalPages}</span> · Total <span className="tabular-nums">{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  title="Rows per page"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                  <option value={10000}>All</option>
                </select>
                <button
                  onClick={() => load({ nextPage: Math.max(1, page - 1) })}
                  disabled={loading || page <= 1 || Number(limit) >= 10_000}
                  className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => load({ nextPage: Math.min(totalPages, page + 1) })}
                  disabled={loading || page >= totalPages || Number(limit) >= 10_000}
                  className="px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
            {loading ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-sm text-slate-300">Loading...</div>
            ) : (
              <Leaderboard data={filteredData} onRefreshStudent={handleRefreshStudent} />
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <FileUpload onUpload={handleUpload} yearFilter={yearFilter} />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
