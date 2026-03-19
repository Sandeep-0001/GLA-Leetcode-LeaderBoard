import React, { useState } from 'react';
import { getUploadProgress, uploadStudents as uploadStudentsApi } from '../services/api';

export default function FileUpload({ onUpload, yearFilter }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  const downloadTemplate = () => {
    const headers = ['name', 'rollNumber', 'leetcodeUsername', 'year', 'section'];
    const sample = [
      ['John Doe', '22CS1001', 'johndoe', '2', 'A'],
      ['Jane Smith', '22CS1002', 'janesmith', '2', 'B'],
    ];
    const csv = [headers.join(','), ...sample.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pollProgress = async (jobId) => {
    let isComplete = false;
    const maxAttempts = 600; // 10 minutes with 1-second polls
    let attempts = 0;

    while (!isComplete && attempts < maxAttempts) {
      try {
        const data = await getUploadProgress(jobId);

        if (data.progress) {
          setProgress(data.progress);
        }

        if (data.state === 'completed') {
          isComplete = true;
          setProgress({
            status: 'completed',
            percentage: 100,
            ...data.progress,
          });
          if (typeof onUpload === 'function') {
            await onUpload();
          }
          setFile(null);
          setError(null);
        } else if (data.state === 'failed') {
          isComplete = true;
          setError(data.failedReason || 'Upload failed');
          setProgress(null);
        }
      } catch (err) {
        console.error('Progress polling error:', err);
      }

      if (!isComplete) {
        await new Promise(r => setTimeout(r, 1000)); // Poll every second
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      setError('Upload timeout - taking too long');
      setProgress(null);
    }

    setUploading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress({ status: 'queuing', percentage: 0 });
    setError(null);

    try {
      const result = await uploadStudentsApi(file, yearFilter || undefined);
      if (result.jobId) {
        // Start polling for progress
        await pollProgress(result.jobId);
      } else {
        setError('Failed to get upload job ID');
        setUploading(false);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
      setUploading(false);
      setProgress(null);
    }
  };

  const getProgressText = () => {
    if (!progress) return '';
    const { status, processed, totalStudents, inserted, updated, failed } = progress;

    switch (status) {
      case 'queuing':
        return 'Queuing upload...';
      case 'fetching_stats':
        return `Fetching LeetCode stats... ${processed}/${totalStudents}`;
      case 'writing_database':
        return `Writing to database... ${processed}/${totalStudents} (Inserted: ${inserted}, Updated: ${updated}${failed > 0 ? `, Failed: ${failed}` : ''})`;
      case 'completed':
        return `✓ Complete! Inserted: ${inserted}, Updated: ${updated}${failed > 0 ? `, Failed: ${failed}` : ''}`;
      default:
        return status;
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="grid gap-2">
        <label htmlFor="studentFile" className="text-sm opacity-90">Upload student list (CSV/XLSX)</label>
        <input
          id="studentFile"
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          aria-describedby="studentFileHelp"
          className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-slate-900/70 file:text-slate-100 file:hover:bg-slate-900/90 file:cursor-pointer bg-slate-900/50 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-60"
        />
      </div>
      <div className="text-xs text-slate-400" id="studentFileHelp">
        Include columns: <span className="font-semibold">name</span>, <span className="font-semibold">rollNumber</span>, <span className="font-semibold">leetcodeUsername</span>, <span className="font-semibold">year</span> (2/3/4), <span className="font-semibold">section</span> (optional).
      </div>

      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cyan-300">{getProgressText()}</span>
            <span className="text-slate-400">{Math.round(progress.percentage || 0)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${Math.round(progress.percentage || 0)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-red-500/20 border border-red-500/50 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={uploading}
          className="px-3 py-2 rounded-md border border-slate-700 bg-slate-900/60 hover:bg-slate-900/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          Download CSV Template
        </button>
        <button
          type="submit"
          disabled={!file || uploading}
          className="px-3 py-2 rounded-md border border-transparent text-cyan-300 bg-cyan-600/20 hover:bg-cyan-600/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? `Uploading...` : 'Upload Students'}
        </button>
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-300">
        <p>If your ID is not present in the leaderboard, you can submit your details using the form below:</p>
        <a
          href="https://forms.visme.co/formsPlayer/op6r4gn1-application-form"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-cyan-600 text-white hover:bg-cyan-500 transition-colors text-[0.7rem] font-medium disabled:opacity-60"
          disabled={uploading}
        >
          Add your ID via form
        </a>
      </div>
    </form>
  );
}
