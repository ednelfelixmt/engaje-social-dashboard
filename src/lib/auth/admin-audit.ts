import {z} from 'zod';

const auditState=z.object({
  role:z.enum(['viewer','editor','client_admin','super_admin']).optional(),
  is_active:z.boolean().optional(),status:z.enum(['pending','accepted','expired','revoked']).optional(),
  changed_fields:z.array(z.string().max(80)).max(50).optional(),
}).strict();
const eventSchema=z.object({
  id:z.string().uuid(),occurred_at:z.string().datetime({offset:true}),actor_id:z.string().uuid(),subject_user_id:z.string().uuid().nullable(),
  event:z.enum(['client_created','client_updated','client_funnel_updated','membership_changed','invitation_revoked']),before_state:auditState,after_state:auditState,
}).strict();
export type AdminAuditEvent=z.infer<typeof eventSchema>;
export function parseAdminAudit(value:unknown):AdminAuditEvent[]|null{
  const result=z.array(eventSchema).max(100).safeParse(value);return result.success?result.data:null;
}
export const adminAuditLabels:Record<AdminAuditEvent['event'],string>={client_created:'Cliente cadastrado',client_updated:'Dados do cliente alterados',client_funnel_updated:'Funil do cliente alterado',membership_changed:'Acesso do usuário alterado',invitation_revoked:'Convite pendente revogado'};
const fields:Record<string,string>={id:'identificador',name:'nome',slug:'endereço',is_agency:'tipo de organização',status:'situação',currency:'moeda',timezone:'fuso horário',niche:'segmento',sales_model:'modelo comercial',funnel_model:'modelo do funil',funnel_steps:'etapas do funil'};
export function adminAuditDescription(event:AdminAuditEvent):string{
  if(event.event==='membership_changed'){
    const roles={viewer:'Visualizador',editor:'Editor',client_admin:'Administrador do cliente',super_admin:'Administrador da agência'};
    const state=(value:AdminAuditEvent['after_state'])=>[value.role?roles[value.role]:'Sem vínculo',value.is_active===true?'ativo':value.is_active===false?'inativo':null].filter(Boolean).join(' · ');
    return state(event.before_state)+' → '+state(event.after_state);
  }
  if(event.event==='invitation_revoked')return 'Convite pendente revogado junto com a atualização do acesso.';
  return 'Campos: '+(event.after_state.changed_fields??[]).map(key=>fields[key]??'outro campo').join(', ')+'.';
}
