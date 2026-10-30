import test from 'node:test';
import assert from 'node:assert/strict';
import {oauthDestination} from '../src/lib/integrations/oauth-destination';
import {integrationHealth,visibleOperationalIntegration} from '../src/lib/integrations/operational-state';

test('OAuth navigation allows only HTTPS authorization hosts without embedded credentials or ports',()=>{
 assert.equal(oauthDestination('https://www.facebook.com/v26.0/dialog/oauth?state=synthetic'),'https://www.facebook.com/v26.0/dialog/oauth?state=synthetic');
 for(const url of ['http://www.facebook.com/oauth','https://www.facebook.com.evil.invalid/','https://evil.invalid/?next=www.facebook.com','javascript:alert(1)','https://user:secret@www.facebook.com/','https://www.facebook.com:444/oauth',null])assert.throws(()=>oauthDestination(url));
});
test('connection state never treats disabled, expired or foundation records as active collectors',()=>{
 assert.equal(integrationHealth({status:'connected',is_enabled:true}).key,'connected');assert.equal(integrationHealth({status:'connected',is_enabled:false}).key,'inactive');assert.equal(integrationHealth({status:'expired',is_enabled:true}).key,'attention');assert.equal(integrationHealth({status:'error',is_enabled:false}).key,'attention');
 const row={status:'pending',is_enabled:false,external_account_id:'synthetic-account',config:{}};
 assert.equal(visibleOperationalIntegration(row),true);
 for(const patch of [{config:{hidden:true}},{config:{selection_pending:true}},{external_account_id:'foundation:rd_station'},{external_account_id:'pending:oauth'}])assert.equal(visibleOperationalIntegration({...row,...patch}),false);
});
