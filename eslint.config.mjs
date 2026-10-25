// Incremental ESLint gate: Phase 01 domain modules and architecture checks.
// Historic UI files remain covered by TypeScript and the architecture gate.
// Expansion to the full repository is tracked separately.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores:['node_modules/**','.next/**']},
  {
    files:[
      'tests/financial-roi-view.test.ts',
      'src/lib/auth/admin-audit.ts',
      'src/app/(agency)/admin/organizations/**/activity/*.tsx',
      'src/app/(agency)/admin/organizations/page.tsx',
      'tests/admin-audit-ui.test.ts',
      'src/app/(agency)/admin/actions.ts',
      'src/lib/auth/admin-mutation-feedback.ts',
      'scripts/local-database.ts',
      'scripts/generate-types.ts',
      'tests/admin-atomic-actions.test.ts',
      'tests/atomic-client-administration.test.ts',
      'src/lib/metrics/weighted-metrics.ts',
      'src/lib/metrics/paid-summary.ts',
      'src/components/dashboard/weighted-metric-note.tsx',
      'tests/weighted-metrics.test.ts',
      'tests/weighted-metric-ui.test.ts',
      'src/lib/auth/session.ts',
      'supabase/functions/_shared/agency-authorization.ts',
      'tests/edge-agency-authorization.test.ts',
      'tests/tenant-admin-boundary.test.ts',
      'tests/navigation-permissions.test.ts',
      'tests/helpers/load-typescript.ts',
      'src/lib/metrics/paid-metrics.ts',
      'src/lib/metrics/calendar.ts',
      'scripts/check-architecture.ts',
      'tests/paid-metrics.test.ts',
      'tests/calendar.test.ts',
      'tests/architecture.test.ts',
    ],
    extends:[...tseslint.configs.recommended],
    rules:{
      '@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}],
    },
  },
);
