import { z } from 'zod'

export const Slot = z.enum(['breakfast', 'lunch', 'dinner', 'snack'])
export type Slot = z.infer<typeof Slot>
export const AvoidTag = z.enum(['pork', 'chicken', 'beef', 'fish', 'seafood', 'egg', 'vegetarian'])
export type AvoidTag = z.infer<typeof AvoidTag>

export const MealInput = z.object({
  days: z.number().int().min(1).max(7),
  slots: z.array(Slot).min(1).max(4),
  people: z.number().int().min(1).max(10),
  avoid: z.array(AvoidTag).max(7).default([])
})
export type MealInput = z.infer<typeof MealInput>

// Pinggang Pinoy (DOST-FNRI): Go = rice, bread, rootcrops; Grow = meat, fish, eggs, beans, milk;
// Glow = vegetables and fruit.
export type PlateGroup = 'Go' | 'Grow' | 'Glow' | 'Other'

export type RecipeView = {
  id: string
  name: string
  course: 'breakfast' | 'main' | 'side' | 'snack'
  tags: string[]
  servings: number
  prepMin: number
  cookMin: number
  ingredients: { foodId: string; name: string; grams: number; group: PlateGroup }[]
  steps: string[]
  // per serving, computed from the PhilFCT rows of the ingredients (an estimate)
  perServing: { kcal: number; proteinG: number; fatG: number; carbG: number }
}

export type MealPlan = {
  id: string
  createdAt: string
  input: MealInput
  days: { meals: { slot: Slot; recipeIds: string[] }[] }[]
}

export type GroceryItem = { foodId: string; name: string; grams: number; group: PlateGroup }

export type PlateDay = { day: number; go: number; grow: number; glow: number; note: string }

export type MealPlanView = {
  plan: MealPlan
  recipes: Record<string, RecipeView>
  grocery: GroceryItem[]
  prep: string[]
  plate: PlateDay[] // adults only; empty for teens (groups without proportions)
}

export const PlanRef = z.tuple([z.string().min(1).max(100), z.number().int().min(0).max(6), Slot])
