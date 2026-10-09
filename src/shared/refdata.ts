import { z } from 'zod'

// Row shapes for data/*.json. Every number is copied from a cited source (data/SOURCES.md);
// tests/data.test.ts fails the build on any incomplete or unsourced row.

export const PortionUnit = z.enum(['cup', 'piece', 'glass', 'bowl', 'plate', 'can', 'serving'])
export type PortionUnit = z.infer<typeof PortionUnit>

export const FoodRow = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  kcalPer100g: z.number().min(0), // 0 only for water and zero-calorie drinks
  portions: z.partialRecord(PortionUnit, z.number().positive()), // grams per unit
  defaultUnit: PortionUnit,
  foodGroup: z.string().min(1),
  source: z
    .string()
    .trim()
    .min(11)
    .refine((s) => !/TODO|</.test(s), 'placeholder source'),
  portionSource: z
    .string()
    .trim()
    .min(11)
    .refine((s) => !/TODO|</.test(s), 'placeholder source')
})
export type FoodRow = z.infer<typeof FoodRow>

export const ActivityRow = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1),
  compendiumCode: z.string().regex(/^\d{5}$/),
  met: z.number().positive(),
  source: z
    .string()
    .trim()
    .min(11)
    .refine((s) => !/TODO|</.test(s), 'placeholder source')
})
export type ActivityRow = z.infer<typeof ActivityRow>

// "tapsilog" -> ["tapa_beef", "rice_garlic", "egg_fried"]
export const Combos = z.record(z.string().min(1), z.array(z.string()).min(1))
export type Combos = z.infer<typeof Combos>
