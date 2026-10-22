// Incremental ESLint gate: Phase 01 domain modules and architecture checks.
// Historic UI files remain covered by TypeScript and the architecture gate.
// Expansion to the full repository is tracked separately.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {ignores:['node_modules/**','.next/**','supabase/functions/**']},
  {
    files:[
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
