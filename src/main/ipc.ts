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
import { activeMealPlan, createMealPlan, recipes as allRecipes, swapMealInPlan } from './meals'
import { loadTaught } from './nlu/taught'
import { FinishInput, WorkoutInput } from '@shared/workouts/types'
import { activePlan, createPlan, deletePlan, finishSession, listPlans as listWorkouts, muscleWeek } from './workouts'
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

  handle('meals:generate', z.tuple([MealInput]), (input) => createMealPlan(input))
  handle('meals:active', none, () => activeMealPlan())
  handle('meals:recipes', none, () => allRecipes)
  handle('meals:swap', PlanRef, (id, day, slot) => swapMealInPlan(id, day, slot))

  handle('workout:generate', z.tuple([WorkoutInput]), (input) => createPlan(input))
  handle('workout:active', none, () => activePlan())
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
