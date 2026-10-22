/**
 * Reproducible static boundary checks using the pinned TypeScript compiler.
 * This is NOT a substitute for ESLint; it enforces critical architecture rules
 * without modifying the dependency lockfile during Phase 01.
 */
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import ts from 'typescript';

export function forbiddenImport(path: string, target: string): string | null {
  const p=path.replaceAll('\\','/');
  if (p.startsWith('src/components/') && (/^@\/lib\/supabase\/(server|admin)/.test(target)||target==='@/lib/auth/session'||target==='server-only')) return 'UI must not import privileged server clients or auth sessions';
  if (p.startsWith('src/lib/metrics/') && (/^@\/components\//.test(target)||/^@\/app\//.test(target)||target==='react'||target==='react-dom')) return 'Metrics domain must not depend on presentation';
  if (p.startsWith('src/lib/metrics/') && /^@\/lib\/supabase\/admin/.test(target)) return 'Metrics domain must not depend on privileged database clients';
  return null;
}

export function checkSource(path:string,source:string):string[] {
  const errors:string[]=[];
  const sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  for(const stmt of sf.statements) {
    if(ts.isImportDeclaration(stmt)&&ts.isStringLiteral(stmt.moduleSpecifier)){
      const target=stmt.moduleSpecifier.text;
      const reason=forbiddenImport(path,target);
      if(reason) errors.push(`${path}: ${reason}: ${target}`);
    }
  }
  return errors;
}
function collect(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?collect(join(dir,e.name)): /\.tsx?$/.test(e.name)?[join(dir,e.name)]:[]);
}

if(process.argv[1] && /check-architecture\.(ts|js)$/.test(process.argv[1])){
  const errors=collect('src').flatMap(path=>checkSource(relative('.',path).split(sep).join('/'),readFileSync(path,'utf8')));
  if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exitCode=1;}
  else process.stdout.write('Architecture boundaries: OK\n');
}
