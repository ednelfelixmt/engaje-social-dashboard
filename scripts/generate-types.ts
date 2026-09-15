import { writeFile } from 'node:fs/promises';
import { createTestDatabase } from './local-database';

// Geração por introspecção real do catálogo PostgreSQL, após executar schema.sql.
// Supabase CLI poderá substituir o arquivo ao conectar o projeto na próxima etapa.
const db = await createTestDatabase();
const { rows: enums } = await db.query<{ name: string; values: string[] }>(`
  select t.typname as name,array_agg(e.enumlabel order by e.enumsortorder) as values
  from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace
  where n.nspname='public' group by t.typname order by t.typname
`);
const { rows: relations } = await db.query<{ name: string; kind: string }>(`
  select c.relname as name,c.relkind as kind from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','v') order by c.relname
`);
const enumNames = new Set(enums.map(e => e.name));
function tsType(udt: string): string {
  if (udt.startsWith('_')) return `(${tsType(udt.slice(1))})[]`;
  if (enumNames.has(udt)) return `Database['public']['Enums']['${udt}']`;
  if (['int2','int4','int8','numeric','float4','float8'].includes(udt)) return 'number';
  if (udt === 'bool') return 'boolean';
  if (['json','jsonb'].includes(udt)) return 'Json';
  return 'string';
}
const tables: string[] = [], views: string[] = [];
for (const rel of relations) {
  const { rows: columns } = await db.query<{ column_name: string; udt_name: string; is_nullable: string; column_default: string | null; is_generated: string }>(`
    select column_name,udt_name,is_nullable,column_default,is_generated from information_schema.columns
    where table_schema='public' and table_name=$1 order by ordinal_position
  `, [rel.name]);
  const row = columns.map(c => `          ${c.column_name}: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''};`).join('\n');
  const insert = columns.map(c => `          ${c.column_name}${c.column_default !== null || c.is_nullable === 'YES' || c.is_generated !== 'NEVER' ? '?' : ''}: ${c.is_generated !== 'NEVER' ? 'never' : tsType(c.udt_name) + (c.is_nullable === 'YES' ? ' | null' : '')};`).join('\n');
  const update = columns.map(c => `          ${c.column_name}?: ${c.is_generated !== 'NEVER' ? 'never' : tsType(c.udt_name) + (c.is_nullable === 'YES' ? ' | null' : '')};`).join('\n');
  const { rows: fks } = await db.query<{ name: string; columns: string[]; referencedRelation: string; referencedColumns: string[]; isOneToOne: boolean }>(`
    select c.conname as name,
      array(select attname from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by k.ord) as columns,
      f.relname as "referencedRelation",
      array(select attname from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by k.ord) as "referencedColumns",
      exists(select 1 from pg_constraint u where u.conrelid=c.conrelid and u.contype in ('p','u') and u.conkey @> c.conkey and u.conkey <@ c.conkey) as "isOneToOne"
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    join pg_class f on f.oid=c.confrelid join pg_namespace fn on fn.oid=f.relnamespace
    where c.contype='f' and n.nspname='public' and t.relname=$1 and fn.nspname='public' order by c.conname
  `, [rel.name]);
  const relationships = fks.map(f => `          { foreignKeyName: ${JSON.stringify(f.name)}; columns: ${JSON.stringify(f.columns)}; isOneToOne: ${f.isOneToOne}; referencedRelation: ${JSON.stringify(f.referencedRelation)}; referencedColumns: ${JSON.stringify(f.referencedColumns)}; }`).join(',\n');
  const common = `      ${rel.name}: {\n        Row: {\n${row}\n        };\n`;
  if (rel.kind === 'r') tables.push(common + `        Insert: {\n${insert}\n        };\n        Update: {\n${update}\n        };\n        Relationships: [\n${relationships}\n        ];\n      };`);
  else views.push(common + '        Relationships: [];\n      };');
}
const { rows: functions } = await db.query<{ name: string; names: string[] | null; types: string[]; result: string }>(`
  select p.proname as name,p.proargnames as names,
    array(select t.typname from unnest(p.proargtypes::oid[]) with ordinality a(oid,ord) join pg_type t on t.oid=a.oid order by a.ord) as types,
    rt.typname as result
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type rt on rt.oid=p.prorettype
  where n.nspname='public' order by p.proname
`);
const functionsText = functions.map(f => `      ${f.name}: { Args: ${f.types.length ? '{ ' + f.types.map((t,i) => `${f.names?.[i]}: ${tsType(t)}`).join('; ') + ' }' : 'Record<PropertyKey, never>'}; Returns: ${tsType(f.result)} };`).join('\n');
await writeFile(new URL('../src/types/database.types.ts', import.meta.url), `// GERADO de supabase/schema.sql pelo catálogo PostgreSQL. Não editar manualmente.
// Datas e UUIDs: string. numeric/int8: number (contrato Supabase JS).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
${tables.join('\n')}
    };
    Views: {
${views.join('\n')}
    };
    Functions: {
${functionsText}
    };
    Enums: {
${enums.map(e => `      ${e.name}: ${e.values.map(v => JSON.stringify(v)).join(' | ')};`).join('\n')}
    };
    CompositeTypes: Record<never, never>;
  };
};
export type TableName = keyof Database['public']['Tables'];
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];
export type DailyPerformance = Database['public']['Views']['daily_performance']['Row'];
export type MemberRole = Database['public']['Enums']['member_role'];
`);
console.log(`Tipos gerados: ${tables.length} tabelas, ${views.length} view, ${enums.length} enums, ${functions.length} funções.`);
await db.close();
