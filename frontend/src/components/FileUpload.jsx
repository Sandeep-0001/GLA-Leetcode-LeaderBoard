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
    <form className="flex flex-col gap-8" onSubmit={submit}>
      {/* Upload Section */}
      <div className="space-y-4">
        <div>
          <label htmlFor="studentFile" className="text-base font-semibold text-slate-100 block mb-1">
            Upload Student List
          </label>
          <p className="text-sm text-slate-400">Supported formats: CSV, XLSX, XLS</p>
        </div>
        
        <div className="relative">
          <input
            id="studentFile"
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
            aria-describedby="studentFileHelp"
            className="block w-full text-sm file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white file:hover:bg-cyan-500 file:cursor-pointer file:font-medium file:transition-colors bg-slate-900/40 border-2 border-dashed border-slate-600 hover:border-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-4 px-4"
          />
        </div>
        
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 space-y-3" id="studentFileHelp">
          <p className="text-sm font-medium text-slate-200">Required columns:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-slate-300"><span className="text-slate-400">•</span> <span className="font-mono text-slate-200">name</span></span>
            <span className="text-slate-300"><span className="text-slate-400">•</span> <span className="font-mono text-slate-200">rollNumber</span></span>
            <span className="text-slate-300"><span className="text-slate-400">•</span> <span className="font-mono text-slate-200">leetcodeUsername</span></span>
            <span className="text-slate-300"><span className="text-slate-400">•</span> <span className="font-mono text-slate-200">year</span> (2/3/4)</span>
            <span className="col-span-2 text-slate-400"><span>○</span> <span className="font-mono">section</span> (optional)</span>
          </div>
        </div>

        {file && (
          <div className="bg-cyan-500/10 border border-cyan-500/40 rounded-lg p-3 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">Selected file</p>
              <p className="text-sm font-medium text-cyan-300 truncate">{file.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="space-y-3 bg-slate-900/60 border border-slate-700 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium text-sm">{getProgressText()}</span>
            <span className="text-slate-400 text-xs font-mono">{Math.round(progress.percentage || 0)}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.round(progress.percentage || 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm space-y-1">
          <p className="font-semibold">Upload Error</p>
          <p className="text-red-100/80">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 sm:flex-row flex-col">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={uploading}
          className="px-5 py-2.5 rounded-lg border border-slate-600 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          Download CSV Template
        </button>
        <button
          type="submit"
          disabled={!file || uploading}
          className="px-5 py-2.5 rounded-lg border border-transparent bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {uploading ? 'Uploading...' : 'Upload Students'}
        </button>
      </div>

      {/* Users Not Found Section */}
      <div className="pt-6 border-t border-slate-700">
        <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">ID Not Found?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              If your LeetCode ID hasn't been added to the leaderboard yet, you can submit your details directly through our form. Your information will be reviewed and added shortly.
            </p>
          </div>
          <a
            href="https://forms.visme.co/formsPlayer/koe064kx-tenant-application-form"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors w-full sm:w-auto"
          >
            Submit Your Details
          </a>
        </div>
      </div>
    </form>
  );
}
