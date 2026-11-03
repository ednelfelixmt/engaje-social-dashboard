/** Keep opaque organization slugs intact; reject ambiguous or unencodable navigation identities. */
const unsafeFormatting = /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B\u200E-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/u;
/** In Unicode-mode regex, valid surrogate pairs form one code point and remain allowed. */
const loneSurrogate = /[\uD800-\uDFFF]/u;

export function validTenantNavigationSlug(value: unknown): value is string {
 return typeof value === 'string'
  && value.trim().length > 0
  && value.trim() === value
  && value !== '.'
  && value !== '..'
  && !unsafeFormatting.test(value)
  && !loneSurrogate.test(value);
}
