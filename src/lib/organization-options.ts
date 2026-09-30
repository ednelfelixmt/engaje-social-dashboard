export const currencyOptions = [
  {id: 'BRL', label: 'Real (BRL)'},
  {id: 'USD', label: 'Dólar (USD)'},
  {id: 'EUR', label: 'Euro (EUR)'},
] as const;

export const timezoneOptions = [
  {id: 'America/Sao_Paulo', label: 'Brasília (São Paulo, Rio, Sul e Sudeste)'},
  {id: 'America/Cuiaba', label: 'Mato Grosso (Cuiabá)'},
  {id: 'America/Campo_Grande', label: 'Mato Grosso do Sul (Campo Grande)'},
  {id: 'America/Fortaleza', label: 'Nordeste (Fortaleza, Recife, Salvador)'},
  {id: 'America/Manaus', label: 'Amazonas (Manaus)'},
  {id: 'America/Rio_Branco', label: 'Acre (Rio Branco)'},
  {id: 'America/Noronha', label: 'Fernando de Noronha'},
  {id: 'Europe/Lisbon', label: 'Portugal (Lisboa)'},
  {id: 'America/New_York', label: 'Nova York'},
  {id: 'UTC', label: 'UTC'},
] as const;

/** Aceita qualquer fuso IANA reconhecido pelo sistema, não só os da lista do formulário. */
export function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('pt-BR', {timeZone: value});
    return value.length <= 64;
  } catch {
    return false;
  }
}
