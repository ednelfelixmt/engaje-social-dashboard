export type CampaignSelection = {platform:'meta_ads'|'google_ads'|'tiktok_ads';account:string;campaign:string};
export type CampaignLinkFilters = {from:string;to:string;currency:string;compare:'none'|'previous_period'|'previous_year'};
const identifier = (value:unknown):value is string => typeof value==='string' && value.trim().length>0 && value===value.trim() && value.length<=512 && ![...value].some(char=>{const code=char.charCodeAt(0);return code<32||(code>=127&&code<=159);});
/** IDs stay opaque strings; only Meta's initial act_ alias is normalized. */
export function campaignSelection(search:Record<string,unknown>):CampaignSelection|null {
 if(typeof search.platform!=='string' || !['meta_ads','google_ads','tiktok_ads'].includes(search.platform) || !identifier(search.account) || !identifier(search.campaign))return null;
 const platform=search.platform as CampaignSelection['platform'];
 const account=platform==='meta_ads'?search.account.replace(/^act_/,''):search.account;
 if(!identifier(account) || (platform==='meta_ads' && account.startsWith('act_')))return null;
 return {platform,account,campaign:search.campaign};
}
export function campaignHref(slug:string,filters:CampaignLinkFilters,selected:CampaignSelection):string {
 if(!slug || slug==='.' || slug==='..')throw new Error('Invalid organization slug');
 return '/'+encodeURIComponent(slug)+'/reports/campaign?'+new URLSearchParams({from:filters.from,to:filters.to,currency:filters.currency,compare:filters.compare,platform:selected.platform,account:selected.account,campaign:selected.campaign}).toString();
}
