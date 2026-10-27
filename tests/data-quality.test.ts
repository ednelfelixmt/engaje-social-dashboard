import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildDataQuality,type QualityInput,type QualityScope,type QualityJob,type QualityMetric} from '../src/lib/metrics/data-quality';
import {SyncJobHistory} from '../src/components/dashboard/sync-job-history';
const scope:QualityScope={organizationId:'10000000-0000-4000-8000-000000000001',businessDate:'2026-10-27',generatedAt:'2026-10-27T13:00:00Z'};
const metric:QualityMetric={id:'metric-1',organization_id:scope.organizationId,platform:'meta_ads',account_id:'account-1',campaign_id:'campaign-1',metric_date:'2026-10-27',synced_at:'2026-10-27T12:00:00Z'};
const job:QualityJob={id:'job-1',organization_id:scope.organizationId,status:'completed',created_at:'2026-10-27T12:00:00Z',started_at:'2026-10-27T12:00:01Z',completed_at:'2026-10-27T12:00:01.250Z',rows_processed:0};
const input=():QualityInput=>({integrations:[],metrics:[metric],dimensions:[],jobs:[job]});
test('quality counts campaign identities by account and chooses collection by instant including offsets',()=>{
 const rows=[metric,{...metric,id:'metric-2',account_id:'account-2',synced_at:'2026-10-27T13:30:00+02:00'}];
 const report=buildDataQuality({...input(),metrics:rows},scope),item=report.items[0];
 assert.equal(item.campaigns,2);assert.equal(item.rows,2);assert.equal(item.days,1);assert.equal(item.lastReceived,'2026-10-27T12:00:00.000Z');assert.equal(item.status,'recent');assert.equal(item.age,0);
});
test('future and impossible metric dates cannot become a recent or empty-history claim',()=>{
 const report=buildDataQuality({...input(),metrics:[{...metric,metric_date:'2026-10-28',synced_at:'2026-10-28T12:00:00Z'},{...metric,id:'metric-2',metric_date:'2026-02-30',synced_at:'2026-02-30T12:00:00Z'}]},scope),item=report.items[0];
 assert.equal(item.status,'invalid');assert.equal(item.rows,2);assert.equal(item.days,0);assert.equal(item.latest,null);assert.equal(item.age,null);assert.equal(item.lastReceived,null);assert.equal(item.futureDates,1);assert.equal(item.invalidDates,1);assert.equal(item.unknownCollections,2);
 const empty=buildDataQuality({...input(),metrics:[]},scope).items[0];assert.equal(empty.status,'missing');assert.equal(empty.rows,0);
 const mixed=buildDataQuality({...input(),metrics:[metric,{...metric,id:'future',metric_date:'2026-10-28'}]},scope).items[0];assert.equal(mixed.latest,'2026-10-27');assert.equal(mixed.futureDates,1);
});
test('quality validates the complete tenant and identity boundary across every input before projecting',()=>{
 for(const records of [[],[metric]])for(const organizationId of ['', 'foreign'])assert.throws(()=>buildDataQuality({...input(),metrics:records},{...scope,organizationId}));
 for(const key of ['integrations','metrics','dimensions','jobs'] as const){const data=input();const row=key==='metrics'?metric:key==='jobs'?job:key==='integrations'?{id:'i',organization_id:scope.organizationId,provider:'meta_ads',status:'connected',is_enabled:true}:{id:'d',organization_id:scope.organizationId,platform:'meta_ads',dimension_type:'age'};Object.assign(data,{[key]:[{...row,organization_id:'10000000-0000-4000-8000-000000000002'}]});assert.throws(()=>buildDataQuality(data,scope),key);Object.assign(data,{[key]:[row,row]});assert.throws(()=>buildDataQuality(data,scope),'duplicate '+key);}
 assert.throws(()=>buildDataQuality(input(),{...scope,businessDate:'2026-02-30'}));assert.throws(()=>buildDataQuality(input(),{...scope,generatedAt:'2026-02-30T00:00:00Z'}));assert.throws(()=>buildDataQuality({...input(),metrics:[{...metric,account_id:''}]},scope));assert.throws(()=>buildDataQuality({...input(),jobs:Array.from({length:13},(_,i)=>({...job,id:'job-'+i}))},scope));
});
test('stored connection state is counted literally and unsupported source platforms remain explicit',()=>{
 const data=input();data.integrations=[{id:'i1',organization_id:scope.organizationId,provider:'meta_ads',status:'connected',is_enabled:true},{id:'i2',organization_id:scope.organizationId,provider:'meta_ads',status:'expired',is_enabled:true},{id:'i3',organization_id:scope.organizationId,provider:'meta_ads',status:'connected',is_enabled:false}];data.metrics.push({...metric,id:'unknown',platform:'unknown' as typeof metric.platform});data.dimensions=[{id:'dim',organization_id:scope.organizationId,platform:'meta_ads',dimension_type:'constructor'}];
 const report=buildDataQuality(data,scope);assert.equal(report.items[0].connected,1);assert.equal(report.items[0].expired,1);assert.equal(report.items[0].integrations,3);assert.equal(report.unsupportedMetricRows,1);assert.equal(report.rows,2);assert.equal(report.items[0].breakdowns.constructor,1);
});
test('only a coherent completed record exposes its stored counter; queued/running/failed defaults are unavailable',()=>{
 const completed=buildDataQuality(input(),scope).jobs[0];assert.equal(completed.recordedCount,0);assert.equal(completed.durationMs,250);
 for(const status of ['queued','running','failed','unrecognized']){const record={...job,status,...(status==='queued'?{started_at:null,completed_at:null}:status==='running'?{completed_at:null}:{})};const view=buildDataQuality({...input(),jobs:[record]},scope).jobs[0];assert.equal(view.recordedCount,null,status);assert.equal(view.status,status==='unrecognized'?'unknown':status);if(status!=='failed')assert.equal(view.durationMs,null);}
 for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'0',null]){const view=buildDataQuality({...input(),jobs:[{...job,rows_processed:value as number}]},scope).jobs[0];assert.equal(view.recordedCount,null);}
});
test('job duration and final count are unavailable for invalid, future or contradictory timelines',()=>{
 for(const patch of [{created_at:'invalid'},{started_at:null},{completed_at:'2026-10-28T00:00:00Z'},{started_at:'2026-10-27T12:00:02Z'},{created_at:'2026-10-27T12:00:01.500Z'},{completed_at:'2026-10-27T12:00:02'},{completed_at:'2026-02-30T12:00:00Z'}]){const view=buildDataQuality({...input(),jobs:[{...job,...patch}]},scope).jobs[0];assert.equal(view.timelineInvalid,true);assert.equal(view.durationMs,null);assert.equal(view.recordedCount,null);}
 const zero=buildDataQuality({...input(),jobs:[{...job,completed_at:job.started_at}]},scope).jobs[0];assert.equal(zero.durationMs,0);assert.equal(zero.recordedCount,0);
});
test('synchronization history renders recorded provenance, unavailable counts and timeline caveats without error details',()=>{
 const report=buildDataQuality({...input(),jobs:[job,{...job,id:'failed',status:'failed'},{...job,id:'bad',completed_at:'invalid'}]},scope);
 const html=renderToStaticMarkup(React.createElement(SyncJobHistory,{jobs:report.jobs}));
 for(const text of ['Até 12 registros','horários UTC','não comprovam qualidade','Conclusão registrada','Falha registrada','Contador final registrado','0,25 s','Cronologia não validada','Indisponível'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('0 registros'));assert.ok(!html.includes('error_summary'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Invalid Date'));
 const empty=renderToStaticMarkup(React.createElement(SyncJobHistory,{jobs:[]}));assert.ok(empty.includes('Isso não comprova ausência de sincronização'));
});

test('microsecond precision preserves positive sub-millisecond duration and rejects reversed instants within one millisecond',()=>{
 const precise={...job,created_at:'2026-10-27T12:00:00.000001Z',started_at:'2026-10-27T12:00:00.000002Z',completed_at:'2026-10-27T12:00:00.000003Z'};
 const report=buildDataQuality({...input(),jobs:[precise],metrics:[{...metric,synced_at:'2026-10-27T12:00:00.000001Z'},{...metric,id:'later',synced_at:'2026-10-27T14:00:00.000002+02:00'}]},scope);
 assert.equal(report.jobs[0].durationMs,0.001);assert.equal(report.jobs[0].recordedCount,0);assert.equal(report.items[0].lastReceived,'2026-10-27T12:00:00.000002Z');
 const html=renderToStaticMarkup(React.createElement(SyncJobHistory,{jobs:report.jobs}));assert.ok(html.includes('0,000001 s'));assert.ok(!html.includes('>0 s<'));
 for(const patch of [{created_at:'2026-10-27T12:00:00.000003Z'},{completed_at:'2026-10-27T12:00:00.000001Z'}]){const invalid=buildDataQuality({...input(),jobs:[{...precise,...patch}]},scope).jobs[0];assert.equal(invalid.timelineInvalid,true);assert.equal(invalid.durationMs,null);assert.equal(invalid.recordedCount,null);}
});
