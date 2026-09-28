// The Meta OAuth callback must run the exact same implementation used to
// initiate the connection. Keeping a separate copy caused incompatible
// candidate records and broken reconnections. Supabase deploys this wrapper
// together with the shared integration source.
import '../engaje-integrations/index.ts';
