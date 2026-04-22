import axios from 'axios';

import type { AuthPayload, AuthUser } from '@/types/auth';
import { apiBaseUrl } from './http';

const authClient = axios.create({
  baseURL: apiBaseUrl || undefined,
  timeout: 10_000,
});

export async function registerRequest(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthPayload> {
  const { data } = await authClient.post<AuthPayload>('/api/auth/register', input);
  return data;
}

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const { data } = await authClient.post<AuthPayload>('/api/auth/login', input);
  return data;
}

export async function meRequest(accessToken: string): Promise<{ user: AuthUser }> {
  const { data } = await authClient.get<{ user: AuthUser }>('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return data;
}

export async function refreshRequest(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data } = await authClient.post<{
    accessToken: string;
    refreshToken: string;
  }>('/api/auth/refresh', {
    refreshToken,
  });

  return data;
}

export async function logoutRequest(input: {
  accessToken: string;
  refreshToken?: string | null;
}): Promise<void> {
  await authClient.post(
    '/api/auth/logout',
    {
      refreshToken: input.refreshToken,
    },
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    },
  );
}
