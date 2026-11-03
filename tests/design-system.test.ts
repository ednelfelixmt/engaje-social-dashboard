import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
import {loadTypescript} from './helpers/load-typescript';

const css=readFileSync(new URL('../src/app/design-system.css',import.meta.url),'utf8');
const {DesignEffects}=loadTypescript<typeof import('../src/components/layout/design-effects')>(new URL('../src/components/layout/design-effects.tsx',import.meta.url),(id,native)=>native(id));
const {DashboardSkeleton}=loadTypescript<typeof import('../src/components/layout/dashboard-skeleton')>(new URL('../src/components/layout/dashboard-skeleton.tsx',import.meta.url),(id,native)=>native(id));

test('design system keeps motion optional, print safe and readable focus',()=>{
 assert.ok(css.includes('prefers-reduced-motion: reduce'));
 assert.ok(css.includes('@media print'));
 assert.ok(css.includes(':focus-visible'));
 assert.ok(css.includes('@supports (animation-timeline: view())'),'revelação ao rolar é progressiva');
 assert.ok(!/animation:[^;]*forwards/.test(css.split('@keyframes ds-reveal')[1]?.split('}')[2]??''),'a revelação não prende o estado final');
});

test('DesignEffects renders nothing and loading skeleton is announced to assistive tech',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(DesignEffects)),'');
 const html=renderToStaticMarkup(React.createElement(DashboardSkeleton));
 assert.ok(html.includes('role="status"')&&html.includes('aria-busy="true"')&&html.includes('Carregando dashboard'));
 assert.ok(html.includes('ds-skeleton'));
});
