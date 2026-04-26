export const SUPPORTED_EMAIL_DOMAINS = [
  'qq.com',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  '163.com',
] as const;

const SUPPORTED_EMAIL_DOMAIN_SET = new Set<string>(SUPPORTED_EMAIL_DOMAINS);

export type SupportedEmailDomain = (typeof SUPPORTED_EMAIL_DOMAINS)[number];

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex >= normalized.length - 1) {
    return '';
  }

  return normalized.slice(atIndex + 1);
}

export function isSupportedEmailDomain(email: string) {
  return SUPPORTED_EMAIL_DOMAIN_SET.has(getEmailDomain(email));
}

export function buildEmailAddress(localPart: string, domain: SupportedEmailDomain) {
  return `${localPart.trim()}@${domain}`;
}
