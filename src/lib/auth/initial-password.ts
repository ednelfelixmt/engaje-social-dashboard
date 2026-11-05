/** Initial password rules for accounts an administrator creates directly (no e-mail round trip). `null` means acceptable. */
export function validateInitialPassword(password: string): string | null {
  if (password.length < 12) return 'A senha inicial precisa ter pelo menos 12 caracteres.';
  if (password.length > 72) return 'A senha inicial pode ter no máximo 72 caracteres.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha inicial.';
  return null;
}
