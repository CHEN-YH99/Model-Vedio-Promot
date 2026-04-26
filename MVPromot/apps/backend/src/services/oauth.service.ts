import { randomUUID } from 'node:crypto';

import { env } from '../config/env.js';
import { redis } from '../plugins/redis.js';
import { HttpError } from '../utils/http-error.js';
import { loginWithOAuth } from './auth.service.js';
import type { OAuthExchangeResponse, OAuthProviderName } from '../types/auth.js';

const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_EXCHANGE_TTL_SECONDS = 3 * 60;

interface OAuthStatePayload {
  provider: OAuthProviderName;
  redirectPath: string;
}

interface OAuthUserProfile {
  providerAccountId: string;
  email: string | null;
  name: string | null;
}

interface OAuthExchangePayload {
  provider: OAuthProviderName;
  redirectPath: string;
  authPayload: OAuthExchangeResponse;
}

function stateRedisKey(provider: OAuthProviderName, state: string) {
  return `auth:oauth:state:${provider}:${state}`;
}

function exchangeRedisKey(code: string) {
  return `auth:oauth:exchange:${code}`;
}

function normalizeRedirectPath(pathValue: string | undefined) {
  if (!pathValue) {
    return '/';
  }

  const normalized = pathValue.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return '/';
  }

  return normalized;
}

function appendQuery(url: string, query: Record<string, string>) {
  const target = new URL(url);

  for (const [key, value] of Object.entries(query)) {
    target.searchParams.set(key, value);
  }

  return target.toString();
}

function buildFrontendCallbackUrl(input: { code?: string; error?: string }) {
  const callbackUrl = new URL(env.OAUTH_FRONTEND_CALLBACK_URL);

  if (input.code) {
    callbackUrl.searchParams.set('code', input.code);
  }

  if (input.error) {
    callbackUrl.searchParams.set('error', input.error);
  }

  return callbackUrl.toString();
}

export function getOAuthErrorRedirectUrl(provider: OAuthProviderName) {
  return buildFrontendCallbackUrl({
    error: provider === 'google' ? 'GOOGLE_OAUTH_FAILED' : 'WECHAT_OAUTH_FAILED',
  });
}

async function requestJson<T>(input: {
  url: string;
  init?: RequestInit;
  provider: OAuthProviderName;
}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(input.url, {
      ...input.init,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError('第三方登录请求超时，请稍后重试', 504, 'OAUTH_PROVIDER_TIMEOUT');
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new HttpError('第三方登录响应异常', 502, 'OAUTH_PROVIDER_RESPONSE_INVALID');
  }

  if (!response.ok) {
    throw new HttpError(
      `${input.provider === 'google' ? 'Google' : '微信'} 登录请求失败`,
      502,
      'OAUTH_PROVIDER_RESPONSE_ERROR',
    );
  }

  return payload as T;
}

async function saveOAuthState(input: OAuthStatePayload) {
  const state = randomUUID().replace(/-/g, '');

  await redis.set(
    stateRedisKey(input.provider, state),
    JSON.stringify(input),
    'EX',
    OAUTH_STATE_TTL_SECONDS,
  );

  return state;
}

async function consumeOAuthState(input: { provider: OAuthProviderName; state: string }) {
  const key = stateRedisKey(input.provider, input.state);
  const raw = await redis.get(key);
  await redis.del(key);

  if (!raw) {
    throw new HttpError('第三方登录状态已失效，请重试', 400, 'OAUTH_STATE_INVALID');
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    throw new HttpError('第三方登录状态解析失败', 500, 'OAUTH_STATE_PARSE_FAILED');
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    (payload as { provider?: string }).provider !== input.provider
  ) {
    throw new HttpError('第三方登录状态不匹配', 400, 'OAUTH_STATE_MISMATCH');
  }

  const redirectPath = normalizeRedirectPath((payload as { redirectPath?: string }).redirectPath);

  return {
    provider: input.provider,
    redirectPath,
  } satisfies OAuthStatePayload;
}

async function saveOAuthExchangePayload(input: OAuthExchangePayload) {
  const code = randomUUID().replace(/-/g, '');

  await redis.set(exchangeRedisKey(code), JSON.stringify(input), 'EX', OAUTH_EXCHANGE_TTL_SECONDS);
  return code;
}

function requireGoogleOAuthConfig() {
  if (!env.OAUTH_GOOGLE_CLIENT_ID || !env.OAUTH_GOOGLE_CLIENT_SECRET || !env.OAUTH_GOOGLE_REDIRECT_URI) {
    throw new HttpError('Google OAuth 未完成配置', 503, 'OAUTH_PROVIDER_NOT_CONFIGURED');
  }

  return {
    clientId: env.OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
    redirectUri: env.OAUTH_GOOGLE_REDIRECT_URI,
  };
}

function requireWeChatOAuthConfig() {
  if (!env.OAUTH_WECHAT_APP_ID || !env.OAUTH_WECHAT_APP_SECRET || !env.OAUTH_WECHAT_REDIRECT_URI) {
    throw new HttpError('微信 OAuth 未完成配置', 503, 'OAUTH_PROVIDER_NOT_CONFIGURED');
  }

  return {
    appId: env.OAUTH_WECHAT_APP_ID,
    appSecret: env.OAUTH_WECHAT_APP_SECRET,
    redirectUri: env.OAUTH_WECHAT_REDIRECT_URI,
  };
}

export async function createGoogleOAuthStartUrl(redirectPath: string | undefined) {
  const googleConfig = requireGoogleOAuthConfig();

  const state = await saveOAuthState({
    provider: 'google',
    redirectPath: normalizeRedirectPath(redirectPath),
  });

  return appendQuery('https://accounts.google.com/o/oauth2/v2/auth', {
    client_id: googleConfig.clientId,
    redirect_uri: googleConfig.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
}

export async function createWeChatOAuthStartUrl(redirectPath: string | undefined) {
  const wechatConfig = requireWeChatOAuthConfig();

  const state = await saveOAuthState({
    provider: 'wechat',
    redirectPath: normalizeRedirectPath(redirectPath),
  });

  const scope = env.OAUTH_WECHAT_SCOPE;
  const authorizeUrl = appendQuery('https://open.weixin.qq.com/connect/oauth2/authorize', {
    appid: wechatConfig.appId,
    redirect_uri: wechatConfig.redirectUri,
    response_type: 'code',
    scope,
    state,
  });

  return `${authorizeUrl}#wechat_redirect`;
}

async function getGoogleOAuthProfile(code: string): Promise<OAuthUserProfile> {
  const googleConfig = requireGoogleOAuthConfig();

  const tokenResponse = await requestJson<{
    access_token?: string;
  }>({
    provider: 'google',
    url: 'https://oauth2.googleapis.com/token',
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        redirect_uri: googleConfig.redirectUri,
      }),
    },
  });

  const accessToken = tokenResponse.access_token;

  if (!accessToken) {
    throw new HttpError('Google 登录未返回有效令牌', 502, 'OAUTH_PROVIDER_RESPONSE_INVALID');
  }

  const profile = await requestJson<{
    sub?: string;
    email?: string;
    name?: string;
  }>({
    provider: 'google',
    url: 'https://openidconnect.googleapis.com/v1/userinfo',
    init: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  if (!profile.sub) {
    throw new HttpError('Google 用户信息不完整', 502, 'OAUTH_PROVIDER_RESPONSE_INVALID');
  }

  return {
    providerAccountId: profile.sub,
    email: profile.email ?? null,
    name: profile.name ?? null,
  };
}

async function getWeChatOAuthProfile(code: string): Promise<OAuthUserProfile> {
  const wechatConfig = requireWeChatOAuthConfig();

  const tokenResponse = await requestJson<{
    access_token?: string;
    openid?: string;
    unionid?: string;
    errcode?: number;
    errmsg?: string;
  }>({
    provider: 'wechat',
    url: appendQuery('https://api.weixin.qq.com/sns/oauth2/access_token', {
      appid: wechatConfig.appId,
      secret: wechatConfig.appSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (tokenResponse.errcode) {
    throw new HttpError(
      `微信登录失败：${tokenResponse.errmsg ?? '未知错误'}`,
      502,
      'OAUTH_PROVIDER_RESPONSE_ERROR',
    );
  }

  const accessToken = tokenResponse.access_token;
  const openId = tokenResponse.openid;

  if (!accessToken || !openId) {
    throw new HttpError('微信登录未返回有效身份信息', 502, 'OAUTH_PROVIDER_RESPONSE_INVALID');
  }

  const userInfo = await requestJson<{
    unionid?: string;
    nickname?: string;
    errcode?: number;
    errmsg?: string;
  }>({
    provider: 'wechat',
    url: appendQuery('https://api.weixin.qq.com/sns/userinfo', {
      access_token: accessToken,
      openid: openId,
      lang: 'zh_CN',
    }),
  });

  if (userInfo.errcode) {
    throw new HttpError(`微信用户信息拉取失败：${userInfo.errmsg ?? '未知错误'}`, 502, 'OAUTH_PROVIDER_RESPONSE_ERROR');
  }

  return {
    providerAccountId: userInfo.unionid ?? tokenResponse.unionid ?? openId,
    email: null,
    name: userInfo.nickname ?? null,
  };
}

async function completeOAuthCallback(input: {
  provider: OAuthProviderName;
  code: string;
  state: string;
}) {
  const normalizedCode = input.code.trim();
  const normalizedState = input.state.trim();

  if (!normalizedCode || !normalizedState) {
    throw new HttpError('第三方登录回调参数缺失', 400, 'OAUTH_CALLBACK_INVALID');
  }

  const statePayload = await consumeOAuthState({
    provider: input.provider,
    state: normalizedState,
  });

  const profile =
    input.provider === 'google'
      ? await getGoogleOAuthProfile(normalizedCode)
      : await getWeChatOAuthProfile(normalizedCode);

  const authPayload = await loginWithOAuth({
    provider: input.provider,
    providerAccountId: profile.providerAccountId,
    email: profile.email,
    name: profile.name,
  });

  const exchangeCode = await saveOAuthExchangePayload({
    provider: input.provider,
    redirectPath: statePayload.redirectPath,
    authPayload: {
      ...authPayload,
      provider: input.provider,
      redirectPath: statePayload.redirectPath,
    },
  });

  return buildFrontendCallbackUrl({ code: exchangeCode });
}

export async function completeGoogleOAuthCallback(input: { code: string; state: string }) {
  try {
    return await completeOAuthCallback({
      provider: 'google',
      code: input.code,
      state: input.state,
    });
  } catch {
    return buildFrontendCallbackUrl({ error: 'GOOGLE_OAUTH_FAILED' });
  }
}

export async function completeWeChatOAuthCallback(input: { code: string; state: string }) {
  try {
    return await completeOAuthCallback({
      provider: 'wechat',
      code: input.code,
      state: input.state,
    });
  } catch {
    return buildFrontendCallbackUrl({ error: 'WECHAT_OAUTH_FAILED' });
  }
}

export async function exchangeOAuthLoginCode(code: string): Promise<OAuthExchangeResponse> {
  const normalized = code.trim();

  if (!normalized) {
    throw new HttpError('OAuth 临时凭证不能为空', 400, 'OAUTH_EXCHANGE_CODE_REQUIRED');
  }

  const key = exchangeRedisKey(normalized);
  const raw = await redis.get(key);
  await redis.del(key);

  if (!raw) {
    throw new HttpError('OAuth 临时凭证无效或已过期', 410, 'OAUTH_EXCHANGE_CODE_EXPIRED');
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    throw new HttpError('OAuth 临时凭证解析失败', 500, 'OAUTH_EXCHANGE_PARSE_FAILED');
  }

  if (!payload || typeof payload !== 'object' || !('authPayload' in payload)) {
    throw new HttpError('OAuth 临时凭证状态异常', 500, 'OAUTH_EXCHANGE_PAYLOAD_INVALID');
  }

  return (payload as OAuthExchangePayload).authPayload;
}
