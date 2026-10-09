import type {
  ConfirmInput,
  ConfirmResult,
  Commitment,
  DaySummary,
  LogEntry,
  ParseResult,
  PlanAction,
  PlanAddInput,
  PlanList,
  Profile,
  ProfileInput
} from './schemas'
import type { AiStatus } from './status'
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
  plan: {
    list(): Promise<PlanList> // plans around today plus the comeback and rest flags
    activities(): Promise<{ id: string; name: string }[]>
    add(input: PlanAddInput): Promise<Commitment> // today or tomorrow, at most two a day
    resolve(id: string, action: PlanAction): Promise<{ ok: true }> // for a missed plan
  }
  streak: {
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
