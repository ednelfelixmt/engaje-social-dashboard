export function ZfMark({className}:{className?:string}){
  return <div className={`zf-mark${className?` ${className}`:''}`} role='img' aria-label='ZF Comunicação'>
    <svg className='zf-crown' viewBox='0 0 120 84' fill='currentColor' aria-hidden='true'>
      <circle cx='60' cy='7' r='6.5'/><circle cx='14' cy='24' r='5.5'/><circle cx='106' cy='24' r='5.5'/>
      <path d='M60 17 79 52 100 31 94 70H26l-6-39 21 21z'/>
      <rect x='24' y='74' width='72' height='7' rx='1.5'/>
    </svg>
    <span className='zf-letters' aria-hidden='true'>ZF</span>
  </div>;
}
