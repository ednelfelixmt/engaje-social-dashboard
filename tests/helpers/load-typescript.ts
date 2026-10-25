import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

/** Evaluate the real module with explicit service/framework doubles, without network or secrets. */
export function loadTypescript<T>(url:URL,resolve:(id:string,native:NodeRequire)=>unknown):T{
 const native=createRequire(url);
 const code=ts.transpileModule(readFileSync(url,'utf8'),{
  fileName:fileURLToPath(url),
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
 }).outputText;
 const module={exports:{}};
 new Function('require','module','exports',code)((id:string)=>resolve(id,native),module,module.exports);
 return module.exports as T;
}
