import { Profile, type ProfileInput } from '@shared/schemas'
import { ageMode, caloriesEnabledFor } from '@shared/profile'
import { db } from './store/db'

export const getProfile = (): Profile | null => db().get().profile

// Mode and caloriesEnabled are derived here from the birth date, never sent by the renderer.
export function saveProfile(input: ProfileInput): Profile {
  const mode = ageMode(input.birthDate)
  if (mode === 'blocked') throw new Error('Vox is for ages 13 and up.')
  const profile = Profile.parse({
    ...input,
    mode,
    caloriesEnabled: caloriesEnabledFor(input, mode),
    updatedAt: new Date().toISOString()
  })
  db().update((d) => ({ ...d, profile }))
  return profile
}
