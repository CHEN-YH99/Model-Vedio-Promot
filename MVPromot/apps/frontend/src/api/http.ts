import axios from 'axios';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiBaseUrl = rawApiBaseUrl ? rawApiBaseUrl.replace(/\/$/, '') : '';

export const http = axios.create({
  baseURL: apiBaseUrl || undefined,
  timeout: 10_000,
});
