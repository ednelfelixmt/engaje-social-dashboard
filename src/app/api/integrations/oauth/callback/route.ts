import {NextResponse} from 'next/server';
import {administrationKey} from '@/lib/auth/administration-key';
import {readConnectionState,completeConnection} from '@/lib/integrations/connection-flow';
import {connectionService} from '@/lib/integrations/connection-service';
export const runtime='nodejs';
const origin='https://mediahub.engajeperformance.com.br';
export async function GET(request:Request){const url=new URL(request.url);
 try{const secret=administrationKey(process.env);if(!secret)throw Error();readConnectionState(url.searchParams.get('state'),secret);
 const result=await completeConnection({state:url.searchParams.get('state'),code:url.searchParams.get('code'),denied:url.searchParams.has('error')},{...connectionService(process.env),environment:process.env,fetcher:fetch});
 return NextResponse.redirect(origin+'/'+encodeURIComponent(result.organizationSlug)+'/settings/integrations?authorization=verified&connection='+encodeURIComponent(result.id),{status:303,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return NextResponse.redirect(origin+'/admin/integrations?authorization=failed',{status:303,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
}
