import {CheckCircle2, CircleDashed, Clock3, TriangleAlert} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {IntegrationControls} from '@/components/integration-controls';
import {IngestEndpoint} from '@/components/ingest-endpoint';

type IntegrationAccountCardProps = {
  organizationId: string;
  item: {
    id: string;
    provider: string;
    external_account_id: string;
    account_name: string;
    status: string;
    is_enabled: boolean;
    last_synced_at: string | null;
    last_error: string | null;
    config: unknown;
    updated_at: string;
  };
  providerName: string;
  source?: string | null;
};

function stateDot(kind: 'healthy' | 'attention' | 'error' | 'idle') {
  if (kind === 'healthy') return <CheckCircle2 aria-hidden className="text-emerald-400" size={16} />;
  if (kind === 'attention') return <TriangleAlert aria-hidden className="text-amber-300" size={16} />;
  if (kind === 'error') return <TriangleAlert aria-hidden className="text-red-400" size={16} />;
  return <CircleDashed aria-hidden className="text-zinc-500" size={16} />;
}

export function IntegrationAccountCard({organizationId, item, providerName, source}: IntegrationAccountCardProps) {
  const config = item.config && typeof item.config === 'object' && !Array.isArray(item.config) ? item.config as Record<string, unknown> : {};
  const diagnostics = config.diagnostics && typeof config.diagnostics === 'object' && !Array.isArray(config.diagnostics) ? config.diagnostics as Record<string, unknown> : {};
  const missingPermissions = Array.isArray(diagnostics.missingPermissions) ? diagnostics.missingPermissions.map(String) : [];
  const technicalError = diagnostics.lastError && typeof diagnostics.lastError === 'object' && !Array.isArray(diagnostics.lastError) ? diagnostics.lastError as Record<string, unknown> : null;
  const supportsIngest = item.provider === 'stract' || item.provider === 'generic_crm';
  const ingestConfigured = typeof config.ingest_key_hash === 'string';
  const staleOauth = item.status === 'pending' && item.external_account_id.startsWith('pending:') && Date.now() - new Date(item.updated_at).getTime() > 10 * 60 * 1000;
  const permissionRequired = missingPermissions.length > 0 || technicalError?.code === '10' || technicalError?.code === '200' || item.last_error?.includes('pages_read_user_content');
  const tokenExpired = staleOauth || item.status === 'expired' || technicalError?.code === '190';
  const connected = !tokenExpired && !['disconnected', 'pending'].includes(item.status);
  const syncing = item.status === 'syncing';
  const synchronized = item.status === 'connected' && Boolean(item.last_synced_at);
  const syncError = item.status === 'error' && !permissionRequired;
  const reconnect = permissionRequired || tokenExpired;
  const actionLabel = permissionRequired ? 'Corrigir autorização' : tokenExpired ? 'Renovar acesso' : syncError ? 'Tentar novamente' : 'Sincronizar agora';
  const userMessage = permissionRequired
    ? 'A Meta precisa autorizar permissões adicionais antes de sincronizar esta conta.'
    : tokenExpired
      ? 'A autorização expirou ou foi revogada.'
      : syncError
        ? item.last_error?.startsWith('Meta recusou') ? 'A Meta não conseguiu concluir a última sincronização.' : item.last_error || 'A última sincronização não foi concluída.'
        : null;

  return <Card className="p-5">
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold">{item.account_name}</h3>
        <p className="muted mt-1 text-xs">{providerName}{source ? ` · ${source}` : ''}</p>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2">{stateDot(connected ? 'healthy' : 'idle')}<div><dt className="text-xs text-zinc-500">Conexão</dt><dd>{connected ? 'Conectado' : 'Configuração pendente'}</dd></div></div>
          <div className="flex items-center gap-2">{stateDot(permissionRequired ? 'attention' : connected ? 'healthy' : 'idle')}<div><dt className="text-xs text-zinc-500">Permissões</dt><dd>{permissionRequired ? 'Ação necessária' : connected ? 'Autorizadas' : 'Não validadas'}</dd></div></div>
          <div className="flex items-center gap-2">{syncing ? <Clock3 aria-hidden className="text-amber-300" size={16} /> : stateDot(synchronized ? 'healthy' : syncError ? 'error' : permissionRequired ? 'attention' : 'idle')}<div><dt className="text-xs text-zinc-500">Sincronização</dt><dd>{syncing ? 'Em andamento' : synchronized ? 'Atualizada' : permissionRequired ? 'Bloqueada' : syncError ? 'Com erro' : 'Ainda não realizada'}</dd></div></div>
        </dl>

        <p className="muted mt-4 text-xs">Última sincronização: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString('pt-BR') : 'ainda não realizada'}</p>
        {userMessage ? <p className={`mt-3 rounded-xl border p-3 text-sm ${permissionRequired || tokenExpired ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>{userMessage}</p> : null}
        {supportsIngest ? <IngestEndpoint organizationId={organizationId} integrationId={item.id} configured={ingestConfigured} /> : null}

        {(technicalError || missingPermissions.length) ? <details className="mt-3 text-xs text-zinc-400"><summary className="cursor-pointer font-medium text-zinc-300">Ver detalhes técnicos</summary><div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/20 p-3">{technicalError?.code ? <p>Código Meta: {String(technicalError.code)}{technicalError.subcode ? `/${String(technicalError.subcode)}` : ''}</p> : null}{technicalError?.endpoint ? <p>Endpoint: {String(technicalError.endpoint)}</p> : null}{missingPermissions.length ? <p>Permissões ausentes: {missingPermissions.join(', ')}</p> : null}{technicalError?.rawMessage ? <p className="break-words">Mensagem original: {String(technicalError.rawMessage)}</p> : null}</div></details> : null}
      </div>

      <div className="space-y-3">
        {(!supportsIngest && item.status !== 'pending') || staleOauth ? <IntegrationControls organizationId={organizationId} provider={item.provider} integrationId={item.id} enabled={item.is_enabled} reconnect={reconnect} actionLabel={actionLabel} /> : supportsIngest ? <span className="connector-badge connector-badge-foundation block text-center">{ingestConfigured ? 'Endpoint preparado' : 'Aguardando credenciais'}</span> : null}
        <details className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm"><summary className="cursor-pointer font-medium">Gerenciar conexão</summary><div className="mt-3 border-t border-white/10 pt-3"><IntegrationControls organizationId={organizationId} provider={item.provider} integrationId={item.id} enabled={item.is_enabled} accountName={item.account_name} allowDisconnect disconnectOnly /></div></details>
      </div>
    </div>
  </Card>;
}
