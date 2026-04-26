const DANGEROUS_CHAR_REGEX = /[<>`]/g;

function stripControlChars(input: string) {
  return Array.from(input)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
}

export function sanitizePlainText(input: string) {
  return stripControlChars(input)
    .replace(DANGEROUS_CHAR_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim();
}
