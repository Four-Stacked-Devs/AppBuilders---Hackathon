import { randomUUID } from 'node:crypto'
import {
  groceryList,
  groupOfFoodGroup,
  planMeals,
  plateDays,
  prepSchedule,
  swapMeal
} from '@shared/meals/plan'
import type { MealInput, MealPlan, MealPlanView, RecipeView, Slot } from '@shared/meals/types'
import recipesJson from '../../data/recipes.json'
import { FOODS } from './matching/match'
import { db } from './store/db'

type Raw = {
  id: string
  name: string
  course: RecipeView['course']
  tags: string[]
  servings: number
  prepMin: number
  cookMin: number
  ingredients: { foodId: string; grams: number }[]
  steps: string[]
}
const foodById = new Map(FOODS.map((f) => [f.id, f]))

// Recipes with nutrition computed from the PhilFCT rows of their ingredients (an estimate).
export const recipes: RecipeView[] = (recipesJson as unknown as Raw[]).map((r) => {
  const ing = r.ingredients.flatMap((i) => {
    const f = foodById.get(i.foodId)
    return f
      ? [{ foodId: f.id, name: f.name, grams: i.grams, group: groupOfFoodGroup(f.foodGroup), f }]
      : []
  })
  const sum = (pick: (f: (typeof ing)[number]['f']) => number): number =>
    Math.round(ing.reduce((n, i) => n + (i.grams / 100) * pick(i.f), 0) / r.servings)
  return {
    id: r.id,
    name: r.name,
    course: r.course,
    tags: r.tags,
    servings: r.servings,
    prepMin: r.prepMin,
    cookMin: r.cookMin,
    steps: r.steps,
    ingredients: ing.map((i) => ({
      foodId: i.foodId,
      name: i.name,
      grams: i.grams,
      group: i.group
    })),
    perServing: {
      kcal: Math.round(sum((f) => f.kcalPer100g) / 10) * 10,
      proteinG: sum((f) => f.proteinG ?? 0),
      fatG: sum((f) => f.fatG ?? 0),
      carbG: sum((f) => f.carbG ?? 0)
    }
  }
})
const byId = new Map(recipes.map((r) => [r.id, r]))

function view(plan: MealPlan): MealPlanView {
  const used: Record<string, RecipeView> = {}
  for (const d of plan.days)
    for (const m of d.meals)
      for (const id of m.recipeIds) {
        const r = byId.get(id)
        if (r) used[id] = r
      }
  const teen = db().get().profile?.mode === 'teen'
  return {
    plan,
    recipes: used,
    grocery: groceryList(plan, byId),
    prep: prepSchedule(plan, byId),
    plate: teen ? [] : plateDays(plan, byId)
  }
}

const save = (plan: MealPlan, active: boolean): void => {
  const sql = db().sql
  if (active) sql.exec('UPDATE meal_plans SET active = 0')
  sql
    .prepare('INSERT OR REPLACE INTO meal_plans (id, json, created_at, active) VALUES (?, ?, ?, ?)')
    .run(plan.id, JSON.stringify(plan), plan.createdAt, active ? 1 : 0)
}

export function createMealPlan(input: MealInput): MealPlanView {
  const plan = planMeals(input, recipes, randomUUID(), new Date().toISOString())
  save(plan, true)
  return view(plan)
}

export function activeMealPlan(): MealPlanView | null {
  const row = db()
    .sql.prepare('SELECT json FROM meal_plans WHERE active = 1 ORDER BY created_at DESC LIMIT 1')
    .get() as { json: string } | undefined
  return row ? view(JSON.parse(row.json) as MealPlan) : null
}

export function swapMealInPlan(id: string, day: number, slot: Slot): MealPlanView {
  const row = db().sql.prepare('SELECT json FROM meal_plans WHERE id = ?').get(id) as
    { json: string } | undefined
  if (!row) throw new Error('That meal plan no longer exists.')
  const plan = swapMeal(JSON.parse(row.json) as MealPlan, recipes, day, slot)
  save(plan, true)
  return view(plan)
}
