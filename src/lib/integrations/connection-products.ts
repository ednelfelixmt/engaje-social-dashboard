import type {Platform} from '@/types/domain';
export type ConnectionMethod='oauth'|'api';
export type ConnectionProductId='google_ads'|'windsor'|'rd_station_crm'|'rd_station_marketing'|'hubspot';
export type ConnectionProduct={id:ConnectionProductId;provider:Platform;name:string;group:'advertising'|'crm'|'data';description:string;methods:readonly ConnectionMethod[];apiLabel:string;credentialPrefix:string;docs:string};
export const connectionProducts:readonly ConnectionProduct[]=[
 {id:'google_ads',provider:'google_ads',name:'Google Ads',group:'advertising',description:'Contas, campanhas e desempenho diretamente da API Google Ads.',methods:['oauth'],apiLabel:'OAuth 2.0 + Google Ads API',credentialPrefix:'GOOGLE_ADS',docs:'https://developers.google.com/google-ads/api/docs/oauth/overview'},
 {id:'windsor',provider:'windsor',name:'Windsor.ai',group:'data',description:'Extrator de dados. A fonte e a conta são escolhidas separadamente.',methods:['api'],apiLabel:'Chave de API Windsor.ai',credentialPrefix:'WINDSOR',docs:'https://windsor.ai/api-documentation/'},
 {id:'rd_station_crm',provider:'rd_station',name:'RD Station CRM',group:'crm',description:'Funis comerciais, etapas e negociações do CRM.',methods:['oauth','api'],apiLabel:'Token de acesso da API CRM v2',credentialPrefix:'RD_CRM',docs:'https://developers.rdstation.com/reference/crm-v2-authentication'},
 {id:'rd_station_marketing',provider:'rd_station',name:'RD Station Marketing',group:'crm',description:'Leads, conversões e automação de marketing.',methods:['oauth','api'],apiLabel:'Token de acesso da API Marketing',credentialPrefix:'RD_MARKETING',docs:'https://developers.rdstation.com/reference/autenticação'},
 {id:'hubspot',provider:'hubspot',name:'HubSpot',group:'crm',description:'Negócios, contatos e funis comerciais.',methods:['oauth','api'],apiLabel:'Token de aplicativo privado HubSpot',credentialPrefix:'HUBSPOT',docs:'https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview'},
];
export function connectionProduct(value:unknown):ConnectionProduct {const found=connectionProducts.find(p=>p.id===value);if(!found)throw new Error('Plataforma inválida.');return found;}
export function supportsConnectionMethod(product:ConnectionProduct,method:unknown):method is ConnectionMethod{return product.methods.some(item=>item===method);}
