import {parseAuthorizedPaidFact,type PaidIngestionFact} from '../integrations/paid-ingestion-contract';
import {reconcilePaidFacts,type ReconciliationResult} from './reconciliation';

/** Pure, tenant-scoped boundary: no inserts, live requests or implicit currency conversion. */
export function reconcileAuthorizedIngestion(payloads:readonly unknown[],authorizedOrganizationId:string):ReconciliationResult{
 if(!authorizedOrganizationId)return {status:'invalid',reason:'Missing authenticated organization scope'};
 const facts:PaidIngestionFact[]=[];
 try{
  for(const payload of payloads)facts.push(parseAuthorizedPaidFact(payload,authorizedOrganizationId));
 }catch{
  return {status:'invalid',reason:'Invalid or unauthorized provider fact'};
 }
 return reconcilePaidFacts(facts.map(f=>({
  platform:f.platform,accountId:f.accountId,campaignId:f.campaignId,
  date:f.date,currency:f.currency,spend:f.spend,impressions:f.impressions,clicks:f.clicks,leads:f.leads
 })));
}
