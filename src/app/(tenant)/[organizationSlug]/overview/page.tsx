import {redirect} from 'next/navigation';
import SectionPage from '../[section]/page';

/** A visão geral é o painel de marketing. A tela anterior segue acessível em ?classico=1. */
export default async function Page({params:pending,searchParams:pendingSearch}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await pending;
 const search=await pendingSearch;
 if(search.classico!=='1')redirect(`/${organizationSlug}/painel`);
 return SectionPage({params:Promise.resolve({organizationSlug,section:'overview'}),searchParams:Promise.resolve(search)});
}
