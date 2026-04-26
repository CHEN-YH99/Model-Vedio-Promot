export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessResponse extends TokenPair {
  user: AuthUser;
}

export type OAuthProviderName = 'google' | 'wechat';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  tkn: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface OAuthExchangeResponse extends AuthSuccessResponse {
  provider: OAuthProviderName;
  redirectPath: string;
}
