/** Show available assets and this client's assignments, never another client's assignments. */
export function clientDiscoveryCandidates<T extends {id: string; asset_status: string}>(assets: readonly T[], assignedIds: readonly string[]): T[] {
  const own = new Set(assignedIds);
  return assets.filter(asset => asset.asset_status !== 'assigned' || own.has(asset.id))
    .map(asset => own.has(asset.id) ? {...asset, asset_status: 'assigned'} : asset);
}
