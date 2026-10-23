/**
 * Reproducible static boundary checks using the pinned TypeScript compiler.
 * This is NOT a substitute for ESLint; it enforces critical architecture rules
 * without modifying the dependency lockfile during Phase 01.
 */
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import ts from 'typescript';

export function forbiddenImport(path: string, target: string, isClientComponent = false): string | null {
  const p=path.replaceAll('\\','/');
  if (isClientComponent && p.startsWith('src/') && (/^@\/lib\/supabase\/(server|admin)/.test(target)||target==='@/lib/auth/session'||target==='server-only')) return 'UI must not import privileged server clients or auth sessions';
  if (p.startsWith('src/lib/metrics/') && (/^@\/components\//.test(target)||/^@\/app\//.test(target)||target==='react'||target==='react-dom')) return 'Metrics domain must not depend on presentation';
  if (p.startsWith('src/lib/metrics/') && /^@\/lib\/supabase\/admin/.test(target)) return 'Metrics domain must not depend on privileged database clients';
  return null;
}

export function checkSource(path:string,source:string):string[] {
  const errors:string[]=[];
  const sf=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const isClientComponent=sf.statements.some(stmt=>ts.isExpressionStatement(stmt)&&ts.isStringLiteral(stmt.expression)&&stmt.expression.text==='use client');
  // Keep privileged credentials outside explicit browser components even when
  // they are accessed indirectly through process.env or dynamic imports.
  if (isClientComponent && path.replaceAll('\\\\','/').startsWith('src/')) {
    const forbiddenEnv=/^(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|DATABASE_URL|DIRECT_URL|META_APP_SECRET|WINDSOR_API_KEY|OPENAI_API_KEY|GOOGLE_CLIENT_SECRET|TIKTOK_APP_SECRET)$/;
    function visit(node:ts.Node):void {
      if(ts.isPropertyAccessExpression(node)&&ts.isPropertyAccessExpression(node.expression)
        &&ts.isIdentifier(node.expression.expression)&&node.expression.expression.text==='process'
        &&node.expression.name.text==='env'&&forbiddenEnv.test(node.name.text)) {
        errors.push(path+': privileged environment variable referenced in client component: '+node.name.text);
      }
      if(ts.isElementAccessExpression(node)&&ts.isPropertyAccessExpression(node.expression)
        &&ts.isIdentifier(node.expression.expression)
        &&node.expression.expression.text==='process'
        &&node.expression.name.text==='env'&&ts.isStringLiteral(node.argumentExpression)
        &&forbiddenEnv.test(node.argumentExpression.text)) {
        errors.push(path+': privileged environment variable referenced in client component: '+node.argumentExpression.text);
      }
      if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments.length===1
        &&ts.isStringLiteral(node.arguments[0])) {
        const target=node.arguments[0].text;
        const reason=forbiddenImport(path,target,true);
        if(reason) errors.push(path+': '+reason+': dynamic import '+target);
      }
      ts.forEachChild(node,visit);
    }
    visit(sf);
  }
  for(const stmt of sf.statements) {
    if(ts.isImportDeclaration(stmt)&&ts.isStringLiteral(stmt.moduleSpecifier)){
      const target=stmt.moduleSpecifier.text;
      const reason=forbiddenImport(path,target,isClientComponent);
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
