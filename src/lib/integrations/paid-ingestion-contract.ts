import {z} from 'zod';

/** Opaque provider IDs must not be rewritten during validation. Whitespace at
 * their edges is an invalid source grain, not an alias to another campaign. */
const providerIdentifier=z.string().min(1).refine(
 value=>value.trim().length>0&&value===value.trim(),
 'Provider identifier must be nonempty and unpadded',
);

/** External facts are validated at the boundary before analytics aggregation. */
export const PaidIngestionFactSchema=z.object({
 organizationId:z.string().uuid(),
 platform:z.enum(['meta_ads','google_ads','tiktok_ads','microsoft_ads']),
 accountId:providerIdentifier,
 campaignId:providerIdentifier,
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v},'Invalid date'),
 currency:z.string().regex(/^[A-Z]{3}$/),
 spend:z.number().finite().nonnegative(),
 impressions:z.number().int().nonnegative().nullable(),
 clicks:z.number().int().nonnegative().nullable(),
 leads:z.number().int().nonnegative().nullable(),
 source:z.enum(['provider_api','authorized_aggregator']),
 collectedAt:z.string().datetime({offset:true}),
}).strict();

export type PaidIngestionFact=z.infer<typeof PaidIngestionFactSchema>;

/** A client-submitted tenant ID is never authorization: caller must independently establish scope. */
export function parseAuthorizedPaidFact(payload:unknown,authorizedOrganizationId:string):PaidIngestionFact{
 const fact=PaidIngestionFactSchema.parse(payload);
 if(fact.organizationId!==authorizedOrganizationId)throw new Error('Tenant scope mismatch');
 return fact;
}
