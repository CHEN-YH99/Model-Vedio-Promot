const SUPPORTED_EMAIL_DOMAINS = ['qq.com', 'gmail.com', 'outlook.com', 'hotmail.com', '163.com'] as const;

const SUPPORTED_EMAIL_DOMAIN_SET = new Set<string>(SUPPORTED_EMAIL_DOMAINS);

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function getEmailDomain(email: string) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return '';
  }

  return normalized.slice(atIndex + 1);
}

export function isSupportedEmailDomain(email: string) {
  const domain = getEmailDomain(email);
  return SUPPORTED_EMAIL_DOMAIN_SET.has(domain);
}

export function getSupportedEmailDomains() {
  return [...SUPPORTED_EMAIL_DOMAINS];
}
