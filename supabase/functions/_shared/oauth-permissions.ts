/**
 * Scope grants must be sourced from the OAuth provider, never from the scope
 * request or business login configuration. Unknown grants remain unknown.
 */
export function verifiedOAuthScopes(providerScopes: readonly string[] | null | undefined): string[] {
 if (!providerScopes) return [];
 return [...new Set(providerScopes.filter(scope=>typeof scope==='string'&&scope.trim().length>0))];
}
export function missingOAuthScopes(required: readonly string[],verified: readonly string[]): string[] {
 const actual=new Set(verified);
 return required.filter(scope=>!actual.has(scope));
}
