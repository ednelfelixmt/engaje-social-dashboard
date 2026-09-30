export default function Loading(){
  return <div aria-label="Carregando dashboard" aria-live="polite" className="mx-auto max-w-[1780px] space-y-6">
    <div className="h-44 animate-pulse rounded-[28px] border border-white/[.07] bg-white/[.035]"/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0,1,2,3].map((item)=><div key={item} className="h-32 animate-pulse rounded-[22px] border border-white/[.07] bg-white/[.035]"/>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="h-72 animate-pulse rounded-[22px] border border-white/[.07] bg-white/[.035]"/>
      <div className="h-72 animate-pulse rounded-[22px] border border-white/[.07] bg-white/[.035]"/>
    </div>
  </div>;
}
