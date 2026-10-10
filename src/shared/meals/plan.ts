import type {
  GroceryItem,
  MealInput,
  MealPlan,
  PlateDay,
  PlateGroup,
  RecipeView,
  Slot
} from './types'

// Meal planning by plain rules. Nothing is random and no AI is involved: the same inputs give
// the same plan. Plates follow Pinggang Pinoy (DOST-FNRI) food groups; there are no calorie
// targets or "good" and "bad" foods anywhere.

export const groupOfFoodGroup = (g: string): PlateGroup =>
  g === 'grains' || g === 'roots'
    ? 'Go'
    : g === 'legumes' || g === 'meat' || g === 'fish' || g === 'eggs' || g === 'milk'
      ? 'Grow'
      : g === 'vegetables' || g === 'fruits'
        ? 'Glow'
        : 'Other'

const MEAT_TAGS = ['pork', 'chicken', 'beef', 'fish', 'seafood']

function allowed(r: RecipeView, avoid: MealInput['avoid']): boolean {
  if (avoid.includes('vegetarian') && r.tags.some((t) => MEAT_TAGS.includes(t))) return false
  return !r.tags.some((t) => avoid.includes(t as never))
}

export function poolFor(
  slot: Slot,
  recipes: RecipeView[],
  avoid: MealInput['avoid']
): RecipeView[] {
  const course = slot === 'breakfast' ? 'breakfast' : slot === 'snack' ? 'snack' : 'main'
  return recipes.filter((r) => r.course === course && allowed(r, avoid))
}

const RICE = 'kanin'

function recipesFor(
  slot: Slot,
  day: number,
  k: number,
  recipes: RecipeView[],
  avoid: MealInput['avoid'],
  skip?: string
): string[] {
  const pool = poolFor(slot, recipes, avoid)
  if (pool.length === 0) return []
  let pick = pool[(day * 3 + k) % pool.length]
  if (skip && pick.id === skip && pool.length > 1) pick = pool[(day * 3 + k + 1) % pool.length]
  if (slot === 'breakfast' || slot === 'snack') return [pick.id]
  const sides = recipes.filter((r) => r.course === 'side' && r.id !== RICE && allowed(r, avoid))
  const side = sides.length ? sides[(day + k) % sides.length] : null
  const rice = recipes.find((r) => r.id === RICE)
  return [
    pick.id,
    ...(rice ? [rice.id] : []),
    ...(side && !pick.tags.includes('veg') ? [side.id] : [])
  ]
}

export function planMeals(
  input: MealInput,
  recipes: RecipeView[],
  id: string,
  createdAt: string
): MealPlan {
  return {
    id,
    createdAt,
    input,
    days: Array.from({ length: input.days }, (_, d) => ({
      meals: input.slots.map((slot, k) => ({
        slot,
        recipeIds: recipesFor(slot, d, k, recipes, input.avoid)
      }))
    }))
  }
}

// Another recipe for one meal (the next one in the pool that is not the current one).
export function swapMeal(plan: MealPlan, recipes: RecipeView[], day: number, slot: Slot): MealPlan {
  const meal = plan.days[day]?.meals.find((m) => m.slot === slot)
  if (!meal) return plan
  const pool = poolFor(slot, recipes, plan.input.avoid)
  const cur = pool.findIndex((r) => r.id === meal.recipeIds[0])
  if (pool.length < 2) return plan
  const next = pool[(cur + 1) % pool.length]
  const fresh = recipesFor(slot, day, 0, recipes, plan.input.avoid)
  meal.recipeIds =
    slot === 'breakfast' || slot === 'snack' ? [next.id] : [next.id, ...fresh.slice(1)]
  return plan
}

const ORDER: Record<PlateGroup, number> = { Go: 0, Grow: 1, Glow: 2, Other: 3 }

export function groceryList(plan: MealPlan, byId: Map<string, RecipeView>): GroceryItem[] {
  const totals = new Map<string, GroceryItem>()
  for (const day of plan.days)
    for (const meal of day.meals)
      for (const rid of meal.recipeIds) {
        const r = byId.get(rid)
        if (!r) continue
        const scale = plan.input.people / r.servings
        for (const ing of r.ingredients) {
          const cur = totals.get(ing.foodId)
          const grams = ing.grams * scale
          totals.set(ing.foodId, { ...ing, grams: (cur?.grams ?? 0) + grams })
        }
      }
  return [...totals.values()]
    .map((i) => ({ ...i, grams: Math.round(i.grams / 5) * 5 }))
    .sort((a, b) => ORDER[a.group] - ORDER[b.group] || a.name.localeCompare(b.name))
}

// What to do ahead of time: cook rice once, cook dishes that appear twice once, prep produce.
export function prepSchedule(plan: MealPlan, byId: Map<string, RecipeView>): string[] {
  const uses = new Map<string, number>()
  const days = new Map<string, number[]>()
  plan.days.forEach((d, di) =>
    d.meals.forEach((m) =>
      m.recipeIds.forEach((rid) => {
        uses.set(rid, (uses.get(rid) ?? 0) + 1)
        days.set(rid, [...(days.get(rid) ?? []), di + 1])
      })
    )
  )
  const out: string[] = []
  const rice = uses.get(RICE)
  if (rice)
    out.push(
      `Cook rice for ${rice} meals: about ${Math.round((rice * plan.input.people * 160) / 10) * 10} g cooked. Keep it in the fridge in containers.`
    )
  for (const [rid, n] of uses) {
    const r = byId.get(rid)
    if (r && n >= 2 && rid !== RICE && r.course !== 'side')
      out.push(`Cook ${r.name} once and eat it twice (days ${days.get(rid)?.join(' and ')}).`)
  }
  const proteins = [...uses.keys()]
    .map((id) => byId.get(id))
    .filter((r): r is RecipeView => !!r && r.tags.some((t) => MEAT_TAGS.includes(t)))
  if (proteins.length)
    out.push(
      `Portion and refrigerate the meat and fish for: ${proteins.map((r) => r.name).join(', ')}. Use fish within 2 days.`
    )
  const produce = new Set<string>()
  for (const id of uses.keys())
    byId
      .get(id)
      ?.ingredients.filter((i) => i.group === 'Glow')
      .forEach((i) => produce.add(i.name.toLowerCase()))
  if (produce.size)
    out.push(`Wash and chop vegetables and fruit: ${[...produce].slice(0, 8).join(', ')}.`)
  out.push('Label each container with the day. Reheat until steaming hot.')
  return out
}

// How the day's lunch and dinner plates compare with the adult plate: half Glow, a third Go,
// a sixth Grow. Gentle wording only, never a score.
export function plateDays(plan: MealPlan, byId: Map<string, RecipeView>): PlateDay[] {
  return plan.days.map((d, di) => {
    const g = { Go: 0, Grow: 0, Glow: 0, Other: 0 }
    for (const m of d.meals)
      for (const rid of m.recipeIds) {
        const r = byId.get(rid)
        if (r) for (const i of r.ingredients) g[i.group] += i.grams / r.servings
      }
    const total = g.Go + g.Grow + g.Glow || 1
    const go = g.Go / total
    const grow = g.Grow / total
    const glow = g.Glow / total
    const note =
      glow < 0.35
        ? 'Add more Glow: vegetables and fruit.'
        : go < 0.2
          ? 'Add some Go: rice, rootcrops or bread.'
          : grow < 0.1
            ? 'Add some Grow: fish, egg, meat or beans.'
            : 'A nicely balanced day.'
    return { day: di + 1, go, grow, glow, note }
  })
}
