import {z} from 'zod';

/** External facts are validated at the boundary before analytics aggregation. */
export const PaidIngestionFactSchema=z.object({
 organizationId:z.string().uuid(),
 platform:z.enum(['meta_ads','google_ads','tiktok_ads','microsoft_ads']),
 accountId:z.string().trim().min(1),
 campaignId:z.string().trim().min(1),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v+'T00:00:00Z')),'Invalid date'),
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
