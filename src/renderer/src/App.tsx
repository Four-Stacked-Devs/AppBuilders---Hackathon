import { useEffect } from 'react'
import { useVox, type Screen } from './store'
import { AiChip } from './components/AiChip'
import { Setup } from './screens/Setup'
import { ProfileScreen } from './screens/Profile'
import { LogScreen } from './screens/Log'
import { TodayScreen } from './screens/Today'

const TABS: { id: Screen; label: string }[] = [
  { id: 'talk', label: 'Log' },
  { id: 'today', label: 'Today' }
]

function App(): React.JSX.Element {
  const { screen, setScreen, ai, setAi, profile, profileLoaded, setProfile } = useVox()

  useEffect(() => {
    const off = window.vox.ai.onStatus(setAi)
    window.vox.ai.status().then(setAi)
    window.vox.profile.get().then(setProfile)
    return off
  }, [setAi, setProfile])

  const needsProfile = profileLoaded && !profile
  let body: React.JSX.Element | null = null
  if (ai.state === 'error') body = <Setup status={ai} />
  else if (!profileLoaded) body = null
  else if (needsProfile || screen === 'onboarding') body = <ProfileScreen />
  else if (screen === 'today') body = <TodayScreen />
  else body = <LogScreen />

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">vox</div>
        {!needsProfile && ai.state !== 'error' && (
          <nav className="tabs" aria-label="Screens">
            {TABS.map((t) => (
              <button
                key={t.id}
                className="tab"
                aria-current={screen === t.id ? 'page' : undefined}
                onClick={() => setScreen(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <div className="spacer" />
        <AiChip status={ai} />
        {profile && (
          <button className="icon-btn" onClick={() => setScreen('onboarding')}>
            {profile.nickname}
          </button>
        )}
      </header>
      <main>{body}</main>
    </div>
  )
}

export default App
