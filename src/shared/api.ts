import type {
  ConfirmInput,
  ConfirmResult,
  Commitment,
  DaySummary,
  FindingId,
  InsightList,
  LogEntry,
  ParseResult,
  PlanAction,
  PlanAddInput,
  PlanList,
  Profile,
  ProfileInput
} from './schemas'
import type { AiStatus } from './status'
import type { MealInput, MealPlanView, RecipeView, Slot } from './meals/types'
import type { FinishInput, WorkoutInput, WorkoutPlan } from './workouts/types'
import type { ChatMessage, ConversationSummary } from './chat'
import type { Streak } from './insights/streak'

// The only API the renderer can call. Exposed by the preload as window.vox.
// Dates are local calendar days, "YYYY-MM-DD".
export interface VoxApi {
  ai: {
    status(): Promise<AiStatus>
    onStatus(cb: (s: AiStatus) => void): () => void
  }
  meta: {
    // What runs where, and how many requests the window has made to the internet since launch.
    get(): Promise<{
      modelFile: string
      gpu: string | null
      whisperModel: string
      dataFile: string
      outsideRequests: number
      lastOutsideHost: string | null
      since: string
    }>
  }
  profile: {
    get(): Promise<Profile | null>
    save(p: ProfileInput): Promise<Profile>
  }
  log: {
    parse(text: string): Promise<ParseResult>
    confirm(input: ConfirmInput): Promise<ConfirmResult>
  }
  day: {
    get(date: string): Promise<DaySummary>
    entries(date: string): Promise<LogEntry[]> // oldest first
  }
  chat: {
    list(): Promise<ConversationSummary[]>
    create(): Promise<{ id: string }>
    rename(id: string, title: string): Promise<{ ok: true }>
    delete(id: string): Promise<{ ok: true }>
    history(id: string): Promise<ChatMessage[]>
    send(id: string, text: string): Promise<ChatMessage[]> // the person's message plus VOX's replies
    confirm(messageId: number, input: ConfirmInput): Promise<ChatMessage>
    discard(messageId: number): Promise<ChatMessage>
  }
  lifts: {
    add(i: { exercise: string; reps: number; weightKg: number }): Promise<{ pr: boolean; est1rm: number }>
    list(): Promise<{ recent: { id: number; date: string; exercise: string; reps: number; weightKg: number; est1rm: number }[]; best: Record<string, number> }>
  }
  data: { export(): Promise<{ path: string } | null> }
  app: { onQuickCapture(cb: () => void): () => void }
  meals: {
    custom(i: { meals: { slot: Slot; recipeIds: string[] }[]; people: number }): Promise<MealPlanView>
    generate(input: MealInput): Promise<MealPlanView> // becomes the active plan
    active(): Promise<MealPlanView | null>
    recipes(): Promise<RecipeView[]>
    swap(id: string, day: number, slot: Slot): Promise<MealPlanView>
  }
  workout: {
    library(): Promise<{ id: string; name: string; muscles: string[]; equipment: string }[]>
    setActive(id: string): Promise<WorkoutPlan | null>
    custom(i: { title: string; days: { name: string; exercises: { exerciseId: string; sets: number; reps: string; restSec: number }[] }[] }): Promise<WorkoutPlan>
    generate(input: WorkoutInput): Promise<WorkoutPlan> // becomes the active plan
    active(): Promise<WorkoutPlan | null>
    list(): Promise<WorkoutPlan[]>
    delete(id: string): Promise<{ ok: true }>
    finish(input: FinishInput): Promise<ConfirmResult> // logs the session
    muscles(): Promise<Record<string, number>> // sets per muscle, last 7 days
  }
  insights: {
    get(): Promise<InsightList> // habit patterns with the logs behind them
    dismiss(id: FindingId): Promise<{ ok: true }> // "This isn't right": not shown again
  }
  plan: {
    list(): Promise<PlanList> // plans around today plus the comeback and rest flags
    activities(): Promise<{ id: string; name: string }[]>
    add(input: PlanAddInput): Promise<Commitment> // today or tomorrow, at most two a day
    resolve(id: string, action: PlanAction): Promise<{ ok: true }> // for a missed plan
  }
  streak: {
    run(): Promise<{ run: string[]; passes: string[] }> // current streak days and rest-pass days
    get(): Promise<Streak> // logging streak for the flame; see src/shared/insights/streak.ts
  }
  entry: {
    delete(id: string): Promise<{ deleted: boolean }> // removes it from this computer
  }
  history: {
    range(from: string, to: string): Promise<DaySummary[]> // inclusive, oldest first
  }
  dev: {
    seed(): Promise<{ entries: number }> // demo history, every entry marked seeded (Phase 5.3)
  }
}
