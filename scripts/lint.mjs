import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {ESLint} from 'eslint';
// Pass the reviewed incremental targets as API arguments, avoiding Windows command length limits.
const root=fileURLToPath(new URL('../',import.meta.url));
const targets=JSON.parse(await readFile(new URL('./lint-files.json',import.meta.url),'utf8'));
const eslint=new ESLint({cwd:root});
const results=await eslint.lintFiles(targets);
const output=(await eslint.loadFormatter('stylish')).format(results);
if(output)console.log(output);
if(results.some(result=>result.errorCount||result.warningCount))process.exitCode=1;
