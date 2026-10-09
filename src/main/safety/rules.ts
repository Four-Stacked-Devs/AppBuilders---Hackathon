import type { SafetyHit } from '@shared/schemas'

// Plain keyword rules on the raw text, run BEFORE the LLM, so a crisis message never
// depends on the model behaving well.
const CRISIS = [
  /gusto ko (nang )?mamatay/,
  /ayoko nang mabuhay/,
  /magpakamatay/,
  /saktan (ang )?sarili/,
  /kill myself/,
  /want to die/,
  /hurt myself/,
  /suicid/
]
const MEDICAL = [
  /chest pain/,
  /sakit (ng|sa) dibdib/,
  /nahimatay/,
  /faint/,
  /hindi (ako )?makahinga/,
  /can'?t breathe/,
  /shortness of breath/
]
const EATING = [
  /isusuka ko/,
  /sinuka ko/,
  /ayoko(ng)? kumain/,
  /hindi (na )?ako kakain/,
  /i hate my body/,
  /magpayat agad/
]

export function checkSafety(text: string): SafetyHit | null {
  const t = text.toLowerCase()
  if (CRISIS.some((r) => r.test(t))) return 'crisis'
  if (MEDICAL.some((r) => r.test(t))) return 'medical'
  if (EATING.some((r) => r.test(t))) return 'eating'
  return null
}
