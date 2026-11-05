import {z} from 'zod';
export const coachSettings=z.object({enabled:z.boolean(),events:z.array(z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),at:z.string().datetime(),before:z.number().int().min(0).max(400),after:z.number().int().min(0).max(400),reason:z.string().max(300)})).max(30).default([])});
