/** Logo da ZF Comunicação: coroa sobre as letras ZF, nas proporções do logo original
 *  (centro da coroa em 52% da largura das letras e 5,8% de folga); a coroa é maior que a do logo, por pedido. */
export function ZfMark({className}:{className?:string}){
  return <div className={`zf-mark${className?` ${className}`:''}`} role='img' aria-label='ZF Comunicação'>
    <span className='zf-lockup' aria-hidden='true'>
      <span className='zf-crownwrap'><img className='zf-crown' src='/zf-crown.png' alt='' width={238} height={205} decoding='async'/></span>
      <img className='zf-letters' src='/zf-letras.png' alt='' width={515} height={294} decoding='async'/>
    </span>
  </div>;
}
