import Link from 'next/link';
import type {OrganicScope} from '@/lib/reports/organic-scope';
export function OrganicReportNavigation({scope,active}:{scope:OrganicScope;active:'content'|'accounts'}){
 const query=new URLSearchParams({from:scope.from,to:scope.to,platform:scope.platform}).toString();
 return <nav data-print-hide aria-label="Relatórios orgânicos" className="flex flex-wrap gap-3 text-sm">
  {[{key:'content',path:'organic-content',label:'Publicações e contadores'},{key:'accounts',path:'organic-accounts',label:'Dados recebidos por conta'}].map(item=><Link key={item.key}
   href={'/'+encodeURIComponent(scope.organizationSlug)+'/reports/'+item.path+'?'+query}
   aria-current={active===item.key?'page':undefined} className="rounded-xl border border-white/15 px-4 py-2 text-zinc-300">{item.label}</Link>)}
 </nav>;
}
