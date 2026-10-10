import type {
  Equipment,
  LibraryExercise,
  PlannedExercise,
  WorkoutDay,
  WorkoutInput,
  WorkoutPlan
} from './types'

// Builds a weekly workout plan from plain rules. No AI and nothing random: the same inputs give
// the same plan. Sets, reps and rest are starting values based on the ACSM resistance-training
// position stand (novice 8-12 RM, 2-3 days a week) and WHO 2020 (adults: muscle strengthening on
// 2 or more days; ages 5-17: an average of 60 minutes a day, strengthening 3 or more days).
// They are starting points to adjust by feel, and the plan says so.

type Pattern = LibraryExercise['pattern']

const ORDER: Record<Equipment, number> = { none: 0, dumbbell: 1, gym: 2 }

const TEMPLATES: Record<number, { name: string; focus: string; patterns: Pattern[] }[]> = {
  2: [
    { name: 'Full body A', focus: 'Legs, push, pull and core', patterns: ['legs', 'push', 'pull', 'core', 'legs'] },
    { name: 'Full body B', focus: 'Legs, push, pull and core', patterns: ['legs', 'pull', 'push', 'core', 'push'] }
  ],
  3: [
    { name: 'Full body A', focus: 'Legs, push, pull and core', patterns: ['legs', 'push', 'pull', 'core'] },
    { name: 'Full body B', focus: 'Legs, pull, push and core', patterns: ['legs', 'pull', 'push', 'core'] },
    { name: 'Full body C', focus: 'Legs, push, pull and core', patterns: ['legs', 'push', 'pull', 'core', 'cardio'] }
  ],
  4: [
    { name: 'Upper body', focus: 'Chest, back, shoulders and arms', patterns: ['push', 'pull', 'push', 'pull', 'core'] },
    { name: 'Lower body', focus: 'Legs, glutes and core', patterns: ['legs', 'legs', 'legs', 'core', 'legs'] },
    { name: 'Upper body 2', focus: 'Chest, back, shoulders and arms', patterns: ['pull', 'push', 'pull', 'push', 'core'] },
    { name: 'Lower body 2', focus: 'Legs, glutes and core', patterns: ['legs', 'legs', 'legs', 'core', 'cardio'] }
  ],
  5: [
    { name: 'Push', focus: 'Chest, shoulders and triceps', patterns: ['push', 'push', 'push', 'push'] },
    { name: 'Pull', focus: 'Back and biceps', patterns: ['pull', 'pull', 'pull', 'core'] },
    { name: 'Legs', focus: 'Quads, glutes and hamstrings', patterns: ['legs', 'legs', 'legs', 'legs'] },
    { name: 'Core and cardio', focus: 'Core and conditioning', patterns: ['core', 'core', 'cardio', 'cardio', 'cardio'] },
    { name: 'Full body', focus: 'Legs, push, pull and core', patterns: ['legs', 'push', 'pull', 'core'] }
  ],
  6: [
    { name: 'Push', focus: 'Chest, shoulders and triceps', patterns: ['push', 'push', 'push', 'push'] },
    { name: 'Pull', focus: 'Back and biceps', patterns: ['pull', 'pull', 'pull', 'core'] },
    { name: 'Legs', focus: 'Quads, glutes and hamstrings', patterns: ['legs', 'legs', 'legs', 'legs'] },
    { name: 'Push 2', focus: 'Chest, shoulders and triceps', patterns: ['push', 'push', 'push', 'push'] },
    { name: 'Pull 2', focus: 'Back and biceps', patterns: ['pull', 'pull', 'pull', 'core'] },
    { name: 'Legs 2', focus: 'Quads, glutes and hamstrings', patterns: ['legs', 'legs', 'legs', 'cardio'] }
  ]
}

export function generatePlan(
  input: WorkoutInput,
  library: LibraryExercise[],
  opts: { teen: boolean; id: string; createdAt: string }
): WorkoutPlan {
  // Teen mode: bodyweight only, 3 days, no weight-loss framing anywhere.
  const equipment: Equipment = opts.teen ? 'none' : input.equipment
  const days = opts.teen ? 3 : input.daysPerWeek
  const eligible = library.filter(
    (e) =>
      ORDER[e.equipment] <= ORDER[equipment] &&
      (input.level === 'intermediate' || e.level === 'beginner') &&
      !e.muscles.some((m) => input.rest.includes(m as never))
  )
  const byPattern = (p: Pattern): LibraryExercise[] => eligible.filter((e) => e.pattern === p)
  const fallback = (p: Pattern): Pattern[] =>
    p === 'pull' ? ['core', 'legs'] : p === 'cardio' ? ['core'] : p === 'push' ? ['core'] : ['core']

  const beginner = input.level === 'beginner'
  const sets = beginner || input.goal === 'habit' ? 2 : 3
  const reps = beginner || input.goal === 'habit' ? '10-12' : input.goal === 'stronger' ? '6-10' : '8-12'
  const rest = input.goal === 'fitter' ? 45 : beginner ? 60 : 90
  const holdSec = beginner ? 20 : 40

  const template = TEMPLATES[days]
  const planDays: WorkoutDay[] = template.map((t, di) => {
    const used = new Set<string>()
    const chosen: LibraryExercise[] = []
    for (const [k, pattern] of t.patterns.entries()) {
      for (const p of [pattern, ...fallback(pattern)]) {
        const pool = byPattern(p).filter((e) => !used.has(e.id))
        if (pool.length === 0) continue
        const pick = pool[(di + k) % pool.length]
        used.add(pick.id)
        chosen.push(pick)
        break
      }
    }
    const exercises: PlannedExercise[] = chosen.map((e) => {
      const timed = Boolean(e.timed)
      const isCardio = e.pattern === 'cardio'
      return {
        exerciseId: e.id,
        name: e.name,
        muscles: e.muscles,
        tip: e.tip,
        sets: isCardio ? 3 : sets,
        reps: timed ? `${isCardio ? 30 : holdSec} sec` : reps,
        timed,
        restSec: isCardio ? 30 : timed ? 30 : rest
      }
    })
    // about 40 s of work per set, plus the rest between sets, plus 5 min warm-up and cool-down each
    const seconds = exercises.reduce((n, e) => n + e.sets * ((e.timed ? parseInt(e.reps, 10) : 40) + e.restSec), 0)
    const estMinutes = Math.max(15, Math.round((seconds / 60 + 10) / 5) * 5)
    return {
      name: t.name,
      focus: t.focus,
      exercises,
      estMinutes,
      activityId: equipment === 'none' ? 'calisthenics_moderate' : 'weight_training_general'
    }
  })

  const notes = [
    'Warm up for about 5 minutes first (easy movement, arm and leg circles) and stretch gently after.',
    'Sets, reps and rest are starting points based on common guidance for new lifters (8 to 12 reps, a few days a week). Adjust them by feel, and rest if something hurts.',
    opts.teen
      ? 'For ages 5 to 17, the World Health Organization suggests an average of about 60 minutes of activity a day, with muscle strengthening on at least 3 days a week.'
      : 'For adults, the World Health Organization suggests 150 to 300 minutes of moderate activity a week plus muscle strengthening on 2 or more days.',
    'This is not medical advice. If you have pain, dizziness or a health condition, talk to a doctor first.'
  ]
  const goalWord = { stronger: 'Get stronger', fitter: 'Get fitter', habit: 'Build a habit' }[input.goal]
  return {
    id: opts.id,
    title: `${goalWord}, ${days} days a week`,
    input: { ...input, equipment, daysPerWeek: days },
    days: planDays,
    notes,
    createdAt: opts.createdAt
  }
}
