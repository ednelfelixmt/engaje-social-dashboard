/** SQL errors roll back a transaction; transport errors may have lost its acknowledgement. */
export function adminMutationFailure(error: {code?: string} | null, fallback: string): {ok: false; message: string} {
  if (error?.code === 'PGRST202') return {ok: false, message: 'Atualização do serviço pendente. Nenhuma alteração foi salva.'};
  if (error?.code === '42501') return {ok: false, message: 'Acesso administrativo indisponível. Nenhuma alteração foi salva.'};
  if (error?.code === '23505') return {ok: false, message: 'Este cadastro já existe. Nenhuma alteração foi salva.'};
  if (error?.code === 'P0002') return {ok: false, message: 'Cliente ou configuração não encontrado. Nenhuma alteração foi salva.'};
  if (error?.code === '23503') return {ok: false, message: 'Usuário ou cliente não encontrado. Nenhuma alteração foi salva.'};
  if (error?.code === '22023') return {ok: false, message: 'Confira os dados e a conclusão do cadastro do usuário. Nenhuma alteração foi salva.'};
  // Unknown/transport failures cannot prove whether a commit was acknowledged.
  return {ok: false, message: fallback + ' Recarregue os dados para confirmar o estado antes de tentar novamente.'};
}
