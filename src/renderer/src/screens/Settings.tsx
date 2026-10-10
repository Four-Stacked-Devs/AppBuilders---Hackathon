import { Cpu, Monitor, Moon, ShieldCheck, Sun, User, CircleCheck } from 'lucide-react'
import { ageYears } from '@shared/calc'
import { useState } from 'react'
import { getLang, setLang } from '../i18n'
import { Mic } from 'lucide-react'
import { useVox } from '../store'
import { getVoiceLang, setVoiceLang, type VoiceLang } from '../voice/stt'
import type { ThemePref } from '../theme'
import { AiChip } from '../components/AiChip'
import { OnDeviceFacts } from '../components/OnDeviceFacts'

const THEMES: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor }
]

const SEX_LABEL = { male: 'Male', female: 'Female', unspecified: 'Prefer not to say' } as const

export function Settings(): React.JSX.Element {
  const { profile, setScreen, themePref, setThemePref, ai } = useVox()
  const [voice, setVoice] = useState<VoiceLang>(getVoiceLang())
  const [demo, setDemo] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  if (!profile) return <div className="page" />
  const teen = profile.mode === 'teen'
  const initials = profile.nickname.slice(0, 2).toUpperCase()
  const dob = new Date(`${profile.birthDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Manage your profile, appearance and privacy.</p>
        </div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="review-head">
            <h3 className="panel-title">
              <User size={18} aria-hidden="true" /> Profile Information
            </h3>
            <button className="btn sm" onClick={() => setScreen('onboarding')}>
              Edit
            </button>
          </div>
          <div style={{ display: 'flex', gap: '1.6rem', marginTop: '1.2rem' }}>
            <span
              className="avatar"
              style={{ width: '5.6rem', height: '5.6rem', fontSize: '1.8rem', fontWeight: 600 }}
            >
              {initials}
            </span>
            <dl className="dl" style={{ marginTop: 0 }}>
              <dt>Name</dt>
              <dd>{profile.nickname}</dd>
              <dt>Date of Birth</dt>
              <dd>
                {dob} ({ageYears(profile.birthDate, new Date())} years old)
              </dd>
              {!teen && (
                <>
                  <dt>Sex</dt>
                  <dd>{SEX_LABEL[profile.sexForFormula]}</dd>
                </>
              )}
              <dt>Height</dt>
              <dd>{profile.heightCm} cm</dd>
              {!teen && (
                <>
                  <dt>Weight</dt>
                  <dd>{profile.weightKg} kg</dd>
                </>
              )}
            </dl>
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Monitor size={18} aria-hidden="true" /> Appearance
          </h3>
          <p className="sub">Theme</p>
          <div className="theme-opts">
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className="theme-opt"
                aria-pressed={themePref === id}
                onClick={() => setThemePref(id)}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="note">Choose how VOX looks on this computer.</p>
        </section>

        <section className="panel">
          <h3 className="panel-title">Language and data</h3>
          <p className="sub">Menu language</p>
          <div className="theme-opts">
            {(['en', 'fil'] as const).map((l) => (
              <button key={l} className="theme-opt" aria-pressed={getLang() === l} onClick={() => { setLang(l); window.location.reload() }}>
                {l === 'en' ? 'English' : 'Filipino'}
              </button>
            ))}
          </div>
          <p className="sub" style={{ marginTop: '1.4rem' }}>Your data</p>
          <button className="btn" onClick={() => void window.vox.data.export()}>Export my data (JSON)</button>
          <p className="note">Saves a copy of your logs and profile to a file you choose. Ctrl+Shift+V opens VOX from anywhere.</p>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Mic size={18} aria-hidden="true" /> Voice language
          </h3>
          <p className="sub">What VOX listens for when you talk</p>
          <div className="theme-opts">
            {(['tagalog', 'english', 'auto'] as VoiceLang[]).map((v) => (
              <button
                key={v}
                className="theme-opt"
                aria-pressed={voice === v}
                onClick={() => {
                  setVoiceLang(v)
                  setVoice(v)
                }}
              >
                {v === 'tagalog' ? 'Tagalog' : v === 'english' ? 'English' : 'Auto'}
              </button>
            ))}
          </div>
          <p className="note">
            Taglish works best with Tagalog. Switch to English if most of your words are English.
          </p>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <ShieldCheck size={18} aria-hidden="true" /> Privacy Overview
          </h3>
          <ul className="checks">
            <li>
              <CircleCheck size={18} aria-hidden="true" /> Your data is stored only on this computer
            </li>
            <li>
              <CircleCheck size={18} aria-hidden="true" /> Nothing is uploaded
            </li>
            <li>
              <CircleCheck size={18} aria-hidden="true" /> The AI runs inside this app
            </li>
          </ul>
          <button
            className="btn sm"
            style={{ marginTop: '1.2rem' }}
            disabled={demo === 'busy'}
            onClick={() => {
              setDemo('busy')
              window.vox.dev.seed().then(
                () => setDemo('done'),
                () => setDemo('error')
              )
            }}
          >
            {demo === 'busy' ? 'Loading…' : demo === 'done' ? 'Demo month loaded. Reopen pages.' : demo === 'error' ? 'Demo is dev only' : 'Load demo month (dev)'}
          </button>
        </section>

        <section className="panel">
          <h3 className="panel-title">
            <Cpu size={18} aria-hidden="true" /> On-device AI
          </h3>
          <div style={{ marginTop: '1.2rem' }}>
            <AiChip status={ai} />
          </div>
          <OnDeviceFacts />
        </section>
      </div>
    </div>
  )
}
