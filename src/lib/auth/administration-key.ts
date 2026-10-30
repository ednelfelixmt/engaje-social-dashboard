/** Server configuration only. Never send this value to a component or log. */
export function administrationKey(environment:Record<string,string|undefined>) {
  return environment.SUPABASE_SECRET_KEY?.trim()||environment.SUPABASE_SERVICE_ROLE_KEY?.trim()||null;
}
