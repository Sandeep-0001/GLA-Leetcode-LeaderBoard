import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function Leaderboard({ data, onRefreshStudent }) {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Virtualization (keeps very large datasets fast): render only visible rows.
  // Keep 500 rows non-virtual to avoid perceived row-size jitter while scrolling.
  const enableVirtual = Array.isArray(data) && data.length > 1000;
  const rowHeight = 48;
  const overscan = 15;

  useEffect(() => {
    if (!enableVirtual) return;
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportHeight(el.clientHeight || 600);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enableVirtual]);

  useEffect(() => {
    // Reset virtual scroll when the dataset/filter changes to avoid stale offsets.
    setScrollTop(0);
    const el = scrollRef.current;
    if (el && el.scrollTop !== 0) {
      el.scrollTop = 0;
    }
  }, [data, enableVirtual]);

  const { startIndex, endIndex, topSpacer, bottomSpacer, visibleRows } = useMemo(() => {
    if (!enableVirtual) {
      return {
        startIndex: 0,
        endIndex: (data?.length || 0) - 1,
        topSpacer: 0,
        bottomSpacer: 0,
        visibleRows: data || [],
      };
    }
    const total = data.length;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const capacity = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(total - 1, start + capacity - 1);
    const top = start * rowHeight;
    const bottom = Math.max(0, (total - end - 1) * rowHeight);
    return {
      startIndex: start,
      endIndex: end,
      topSpacer: top,
      bottomSpacer: bottom,
      visibleRows: data.slice(start, end + 1),
    };
  }, [data, enableVirtual, scrollTop, viewportHeight]);
  const formatLastSubmit = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    const now = new Date();
    const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString();
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center text-slate-300">
        No records found for the selected year.
      </div>
    );
  }

  const rankBadge = (rank) => {
    const base = 'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold tabular-nums';
    if (rank === 1) return <span className={`${base} bg-linear-to-br from-yellow-300 to-yellow-500 text-black`}>1</span>;
    if (rank === 2) return <span className={`${base} bg-linear-to-br from-gray-200 to-gray-400 text-black`}>2</span>;
    if (rank === 3) return <span className={`${base} bg-linear-to-br from-amber-300 to-amber-500 text-black`}>3</span>;
    return <span className={`${base} bg-slate-900/70 border border-slate-700 text-slate-100/90`}>{rank}</span>;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => {
        if (!enableVirtual) return;
        setScrollTop(e.currentTarget.scrollTop);
      }}
    >
      <table className="min-w-full text-sm" role="table" aria-label="LeetCode leaderboard with student rankings and solved problems">
        <thead className="bg-slate-900/80 sticky top-0 z-10 backdrop-blur supports-backdrop-filter:bg-slate-900/60">
          <tr className="border-b border-slate-700/80">
            <th className="px-4 py-3 text-left font-semibold" scope="col">Rank</th>
            <th className="px-4 py-3 text-left font-semibold" scope="col">Roll No.</th>
            <th className="px-4 py-3 text-left font-semibold" scope="col">Name</th>
            <th className="px-4 py-3 text-left font-semibold" scope="col">Section</th>
            <th className="px-4 py-3 text-right font-semibold tabular-nums text" scope="col">Easy</th>
            <th className="px-4 py-3 text-right font-semibold tabular-nums" scope="col">Medium</th>
            <th className="px-4 py-3 text-right font-semibold tabular-nums" scope="col">Hard</th>
            <th className="px-4 py-3 text-right font-semibold tabular-nums" scope="col">Total</th>
            <th className="px-4 py-3 text-right font-semibold tabular-nums" scope="col">Rating</th>
          </tr>
        </thead>
        <tbody>
          {enableVirtual && topSpacer > 0 ? (
            <tr aria-hidden>
              <td colSpan={9} style={{ height: topSpacer }} />
            </tr>
          ) : null}

          {visibleRows.map((s, i) => (
            <tr
              key={s._id || s.rollNumber || i}
              className="odd:bg-white/5 hover:bg-cyan-600/10 transition-colors"
              style={enableVirtual ? { height: rowHeight } : undefined}
            >
              <td className="px-4 py-3 text-left">{rankBadge(Number(s.rank) || (i + 1))}</td>
              <td className="px-4 py-3 text-left tabular-nums font-mono">{s.universityId ? String(s.universityId) : (s.rollNumber || s.roll || s.rollNo || '-')}</td>
              <td className="px-4 py-3">
                <a
                  href={`https://leetcode.com/${s.leetcodeUsername}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 hover:underline"
                  title={`Open ${s.leetcodeUsername} on LeetCode (also refresh stats)`}
                  onClick={() => {
                    if (onRefreshStudent && s._id) {
                      // Fire and forget; do not block navigation
                      onRefreshStudent(s._id);
                    }
                  }}
                >
                  {s.name}
                </a>
              </td>
              <td className="px-4 py-3 text-left">{s.section || '-'}</td>
              <td className="px-4 py-3 text-right tabular-nums text-green-500">{s.easySolved}</td>
              <td className="px-4 py-3 text-right tabular-nums text-yellow-500">{s.mediumSolved}</td>
              <td className="px-4 py-3 text-right tabular-nums text-red-500">{s.hardSolved}</td>
              <td className="px-4 py-3 text-right tabular-nums text-cyan-500">{s.totalSolved}</td>
              <td className="px-4 py-3 text-right tabular-nums text-cyan-500">{s.contestRating?.toFixed ? s.contestRating.toFixed(2) : s.contestRating}</td>
            </tr>
          ))}

          {enableVirtual && bottomSpacer > 0 ? (
            <tr aria-hidden>
              <td colSpan={9} style={{ height: bottomSpacer }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
