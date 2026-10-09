import type { SafetyHit } from '@shared/schemas'

// Fixed text, never generated. Re-check the hotline numbers on the morning of the demo.
// Never claim a call is confidential or describe what authorities will do.
export const SAFETY_MESSAGES: Record<SafetyHit, string> = {
  crisis:
    "Salamat sa pagsabi mo nito. Mukhang mabigat ang pinagdadaanan mo ngayon, at hindi mo kailangang harapin 'yan nang mag-isa. Pwede kang tumawag sa NCMH Crisis Hotline sa 1553, libre at bukas 24/7. Kung nasa panganib ka ngayon, tumawag sa 911.",
  medical:
    'Itigil muna ang ginagawa mo. Ang pananakit ng dibdib, pagkahimatay o hirap sa paghinga ay kailangang matingnan agad ng doktor. Kung emergency, tumawag sa 911.',
  eating:
    "Salamat sa pagiging tapat mo. Hindi mo kailangang harapin 'to nang mag-isa. Magandang kausapin ang doktor o taong pinagkakatiwalaan mo. Bukas din 24/7 ang NCMH Crisis Hotline sa 1553."
}
