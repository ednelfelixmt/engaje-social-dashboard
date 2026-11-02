import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

let pathname:string|null='/demo/reports/analytics';
const {ClientHeader}=loadTypescript<typeof import('../src/components/layout/client-header')>(new URL('../src/components/layout/client-header.tsx',import.meta.url),(id,native)=>{
 if(id==='next/navigation')return {usePathname:()=>pathname};
 if(id==='next/link')return {__esModule:true,default:({href,children,...rest}:{href:string;children:React.ReactNode})=>React.createElement('a',{href,...rest},children)};
 return native(id);
});
const {ZfFooter}=loadTypescript<typeof import('../src/components/layout/zf-footer')>(new URL('../src/components/layout/zf-footer.tsx',import.meta.url),(id,native)=>native(id));

test('client header shows the client name, falls back to initials and keeps the sign-out form',()=>{
 const html=renderToStaticMarkup(React.createElement(ClientHeader,{slug:'demo',name:'Reserva das Aroeiras',logoUrl:null}));
 assert.ok(html.includes('Reserva das Aroeiras'));
 assert.ok(html.includes('>RD<'),'sem logo, mostra as iniciais');
 assert.ok(html.includes('action="/auth/signout"')&&html.includes('method="post"'));
 assert.ok(html.includes('href="/"')&&html.includes('href="/demo/reports"'));
 assert.ok(html.includes('data-client-dashboard-header'));
});

test('client header uses the logo image when present and escapes the name in attributes',()=>{
 const html=renderToStaticMarkup(React.createElement(ClientHeader,{slug:'demo',name:'A "B" <C>',logoUrl:'https://exemplo.test/logo.png'}));
 assert.ok(html.includes('src="https://exemplo.test/logo.png"'));
 assert.ok(!html.includes('<C>'),'o nome nunca entra como HTML');
});

test('client header marks the current section and starts with the mobile menu closed',()=>{
 pathname='/demo/reports/analytics';
 let html=renderToStaticMarkup(React.createElement(ClientHeader,{slug:'demo',name:'Cliente',logoUrl:null}));
 assert.ok(/href="\/demo\/reports"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/demo\/reports"/.test(html));
 assert.ok(html.includes('aria-expanded="false"')&&html.includes('aria-controls="client-header-nav"'));
 assert.ok(!html.includes('is-open'));
 pathname='/demo/overview';
 html=renderToStaticMarkup(React.createElement(ClientHeader,{slug:'demo',name:'Cliente',logoUrl:null}));
 assert.ok(/href="\/"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/"/.test(html));
 pathname=null;
 assert.doesNotThrow(()=>renderToStaticMarkup(React.createElement(ClientHeader,{slug:'demo',name:'Cliente',logoUrl:null})));
});

test('ZF footer renders the small mark with an accessible name and is hidden in TV mode',()=>{
 const html=renderToStaticMarkup(React.createElement(ZfFooter));
 assert.ok(html.includes('src="/zf-marca.png"')&&html.includes('alt="ZF Comunicação"'));
 assert.ok(html.includes('tv-hide'));
});

test('closed mobile menu is removed from keyboard and accessibility order',()=>{
 const css=readFileSync(new URL('../src/app/client-shell.css',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 const mobile=css.slice(css.indexOf('@media (max-width: 720px)'));
 assert.ok(/visibility:\s*hidden/.test(mobile),'menu fechado precisa de visibility:hidden');
 assert.ok(/\.client-header__nav\.is-open\s*\{[^}]*visibility:\s*visible/.test(mobile),'menu aberto volta a ser visível');
});
