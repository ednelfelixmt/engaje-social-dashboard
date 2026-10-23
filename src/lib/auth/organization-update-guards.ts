/**
 * Validate dependent organization settings before persisting any record.
 * Rejecting an incomplete funnel request after the first write would leave
 * an unintended partially updated organization.
 */
export function validateOrganizationUpdateRequest(input:{
  applyFunnel:boolean;
  niche:string|null;
  salesModel:string|null;
}):{ok:true}|{ok:false;message:string}{
  if(input.applyFunnel&&(!input.niche||!input.salesModel)){
    return {ok:false,message:'Para aplicar o funil, informe o nicho e o modelo de vendas. Nenhuma alteração foi salva.'};
  }
  return {ok:true};
}
