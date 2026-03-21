import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API = axios.create({ baseURL: `${API_BASE}/api/students` });

export const uploadStudents = async (file, year) => {
  const fd = new FormData();
  fd.append('file', file);
  if (year) fd.append('year', year);
  const { data } = await API.post('/upload', fd, { 
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  });
  return data;
};

export const getUploadProgress = async (jobId) => {
  const { data } = await API.get(`/upload-progress/${jobId}`);
  return data;
};

export const getSections = async (year) => {
  const { data } = await API.get('/sections', {
    params: { year },
  });
  return data;
};

export const getLeaderboard = async (opts = {}) => {
  const { year, section, page, limit, q } = opts || {};
  const params = {
    t: Date.now(),
    page: page ?? 1,
    limit: limit ?? 50,
  };
  if (year) params.year = year;
  if (section) params.section = section;
  if (q) params.q = q;
  
  const { data } = await API.get('/leaderboard', {
    params,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
  return data;
};

export const refreshStudentStats = async (id) => {
  const { data } = await API.post(`/${id}/refresh`);
  return data;
};

export const refreshAll = async () => {
  const { data } = await API.post('/refresh-all');
  return data;
};
