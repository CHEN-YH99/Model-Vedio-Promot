export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
}

export interface AuthPayload {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
