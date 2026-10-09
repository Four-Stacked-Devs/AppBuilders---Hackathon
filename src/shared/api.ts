import type {
  ConfirmInput,
  ConfirmResult,
  DaySummary,
  ParseResult,
  Profile,
  ProfileInput
} from './schemas'
import type { AiStatus } from './status'

// The only API the renderer can call. Exposed by the preload as window.vox.
// Dates are local calendar days, "YYYY-MM-DD".
export interface VoxApi {
  ai: {
    status(): Promise<AiStatus>
    onStatus(cb: (s: AiStatus) => void): () => void
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
  }
  history: {
    range(from: string, to: string): Promise<DaySummary[]> // inclusive, oldest first
  }
  dev: {
    seed(): Promise<{ entries: number }> // demo history, every entry marked seeded (Phase 5.3)
  }
  // Temporary Phase 1 debug hook: sends raw text to the model, returns raw output.
  debug: {
    generate(text: string): Promise<string>
  }
}
