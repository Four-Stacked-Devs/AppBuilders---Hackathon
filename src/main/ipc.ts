import { app, ipcMain } from 'electron'
import { z } from 'zod'
import {
  ConfirmInput,
  DateArg,
  LogText,
  FindingId,
  PlanAction,
  PlanAddInput,
  ProfileInput
} from '@shared/schemas'
import { getStatus } from './ai/llm'
import { parseLog } from './ai/parse'
import { confirmLog, deleteEntry, getDay, getEntries, getHistory, getStreak, getStreakRun } from './confirm'
import { seedDemoHistory } from './dev/seed'
import { dismissInsight, getInsights } from './insights'
import { ChatText, ChatTitle, ConversationId } from '@shared/chat'
import { confirmLogMessage, discardLogMessage, sendMessage } from './chat/coach'
import {
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  renameConversation
} from './chat/repo'
import { MealInput, PlanRef } from '@shared/meals/types'
import { activeMealPlan, createCustomMealPlan, createMealPlan, recipes as allRecipes, swapMealInPlan } from './meals'
import { addLift, exportData, listLifts } from './extras'
import { localDate } from '@shared/dates'
import { loadTaught } from './nlu/taught'
import { FinishInput, WorkoutInput } from '@shared/workouts/types'
import { activePlan, createCustomPlan, createPlan, setActivePlan, workoutLibrary, deletePlan, finishSession, listPlans as listWorkouts, muscleWeek } from './workouts'
import { getMeta } from './meta'
import { addPlan, listActivities, listPlans, resolvePlan } from './plans'
import { getProfile, saveProfile } from './profile'

// Every handler validates its arguments (as a tuple) with Zod before touching them.
function handle<S extends z.ZodType<unknown[]>>(
  channel: string,
  args: S,
  fn: (...input: z.infer<S>) => unknown
): void {
  ipcMain.handle(channel, async (_e, ...raw) => fn(...(args.parse(raw) as z.infer<S>)))
}

const none = z.tuple([])

export function registerIpc(): void {
  loadTaught() // words the person taught VOX
  handle('ai:status', none, () => getStatus())
  handle('meta:get', none, () => getMeta())

  handle('profile:get', none, () => getProfile())
  handle('profile:save', z.tuple([ProfileInput]), (p) => saveProfile(p))

  handle('log:parse', z.tuple([LogText]), (text) => parseLog(text))
  handle('log:confirm', z.tuple([ConfirmInput]), (input) => confirmLog(input))

  handle('day:get', z.tuple([DateArg]), (date) => getDay(date))
  handle('history:range', z.tuple([DateArg, DateArg]), (from, to) => getHistory(from, to))
  handle('day:entries', z.tuple([DateArg]), (date) => getEntries(date))
  handle('streak:get', none, () => getStreak())
  handle('streak:run', none, () => getStreakRun())

  handle('chat:list', none, () => listConversations())
  handle('chat:create', none, () => ({ id: createConversation() }))
  handle('chat:rename', z.tuple([ConversationId, ChatTitle]), (id, title) => {
    renameConversation(id, title)
    return { ok: true }
  })
  handle('chat:delete', z.tuple([ConversationId]), (id) => {
    deleteConversation(id)
    return { ok: true }
  })
  handle('chat:history', z.tuple([ConversationId]), (id) => getMessages(id))
  handle('chat:send', z.tuple([ConversationId, ChatText]), (id, text) => sendMessage(id, text))
  handle('chat:confirm', z.tuple([z.number().int(), ConfirmInput]), (id, input) =>
    confirmLogMessage(id, input)
  )
  handle('chat:discard', z.tuple([z.number().int()]), (id) => discardLogMessage(id))

  handle('lifts:add', z.tuple([z.object({ exercise: z.string().trim().min(1).max(60), reps: z.number().int().min(1).max(100), weightKg: z.number().min(0).max(600) })]), (i) => addLift(i, localDate()))
  handle('lifts:list', none, () => listLifts())
  handle('data:export', none, () => exportData())

  handle('meals:generate', z.tuple([MealInput]), (input) => createMealPlan(input))
  handle('meals:active', none, () => activeMealPlan())
  handle('meals:recipes', none, () => allRecipes)
  handle('meals:swap', PlanRef, (id, day, slot) => swapMealInPlan(id, day, slot))

  handle('workout:generate', z.tuple([WorkoutInput]), (input) => createPlan(input))
  handle('workout:active', none, () => activePlan())
  handle('workout:library', none, () => workoutLibrary())
  handle('workout:setActive', z.tuple([z.string().min(1).max(100)]), (id) => setActivePlan(id))
  handle(
    'workout:custom',
    z.tuple([
      z.object({
        title: z.string().trim().min(1).max(60),
        days: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(40),
              exercises: z
                .array(z.object({ exerciseId: z.string().max(60), sets: z.number().int().min(1).max(10), reps: z.string().max(20), restSec: z.number().int().min(0).max(300) }))
                .min(1)
                .max(15)
            })
          )
          .min(1)
          .max(7)
      })
    ]),
    (i) => createCustomPlan(i)
  )
  handle(
    'meals:custom',
    z.tuple([
      z.object({
        meals: z.array(z.object({ slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']), recipeIds: z.array(z.string().max(60)).min(1).max(6) })).min(1).max(8),
        people: z.number().int().min(1).max(10)
      })
    ]),
    (i) => createCustomMealPlan(i)
  )
  handle('workout:list', none, () => listWorkouts())
  handle('workout:delete', z.tuple([z.string().min(1).max(100)]), (id) => {
    deletePlan(id)
    return { ok: true }
  })
  handle('workout:finish', z.tuple([FinishInput]), (input) => finishSession(input))
  handle('workout:muscles', none, () => muscleWeek())

  handle('insights:get', none, () => getInsights())
  handle('insights:dismiss', z.tuple([FindingId]), (id) => dismissInsight(id))

  handle('plan:list', none, () => listPlans())
  handle('plan:activities', none, () => listActivities())
  handle('plan:add', z.tuple([PlanAddInput]), (input) => addPlan(input))
  handle('plan:resolve', z.tuple([z.string().min(1).max(100), PlanAction]), (id, action) =>
    resolvePlan(id, action)
  )
  handle('entry:delete', z.tuple([z.string().min(1).max(100)]), (id) => deleteEntry(id))

  // Demo history is a dev tool only; packaged builds never seed.
  handle('dev:seed', none, () => {
    if (app.isPackaged) throw new Error('dev:seed is not available in packaged builds')
    return seedDemoHistory()
  })
}
