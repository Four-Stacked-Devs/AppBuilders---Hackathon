import { z } from 'zod'

export const Goal = z.enum(['stronger', 'fitter', 'habit'])
export type Goal = z.infer<typeof Goal>
export const Equipment = z.enum(['none', 'dumbbell', 'gym'])
export type Equipment = z.infer<typeof Equipment>
export const Level = z.enum(['beginner', 'intermediate'])
export type Level = z.infer<typeof Level>
export const MUSCLES = ['chest', 'shoulders', 'triceps', 'biceps', 'back', 'core', 'glutes', 'quads', 'hamstrings', 'calves'] as const
export const Muscle = z.enum(MUSCLES)
export type Muscle = z.infer<typeof Muscle>

export const WorkoutInput = z.object({
  goal: Goal,
  daysPerWeek: z.number().int().min(2).max(6),
  equipment: Equipment,
  level: Level,
  rest: z.array(Muscle).max(10).default([]) // muscles to leave out (sore or injured)
})
export type WorkoutInput = z.infer<typeof WorkoutInput>

export type LibraryExercise = {
  id: string
  name: string
  muscles: string[]
  equipment: Equipment
  level: Level
  pattern: 'push' | 'pull' | 'legs' | 'core' | 'cardio'
  activityId: string
  tip: string
  timed?: boolean
}

export type PlannedExercise = {
  exerciseId: string
  name: string
  muscles: string[]
  tip: string
  sets: number
  reps: string // "8-12" or "30 sec"
  timed: boolean
  restSec: number
}

export type WorkoutDay = {
  name: string
  focus: string
  exercises: PlannedExercise[]
  estMinutes: number
  activityId: string // the Compendium activity used to log the session
}

export type WorkoutPlan = {
  id: string
  title: string
  input: WorkoutInput
  days: WorkoutDay[]
  notes: string[]
  createdAt: string
}

export const FinishInput = z.object({
  planId: z.string().min(1).max(100),
  dayIndex: z.number().int().min(0).max(6),
  minutes: z.number().int().min(1).max(300)
})
export type FinishInput = z.infer<typeof FinishInput>
