import { useEffect } from 'react'
import { useVox } from './store'
import { Sidebar } from './components/Sidebar'
import { Setup } from './screens/Setup'
import { ProfileScreen } from './screens/Profile'
import { LogScreen } from './screens/Log'
import { TodayScreen } from './screens/Today'

function App(): React.JSX.Element {
  const { screen, setAi, ai, profile, profileLoaded, setProfile } = useVox()

  useEffect(() => {
    const off = window.vox.ai.onStatus(setAi)
    window.vox.ai.status().then(setAi)
    window.vox.profile.get().then(setProfile)
    return off
  }, [setAi, setProfile])

  if (ai.state === 'error')
    return (
      <div className="app bare">
        <main className="main">
          <Setup status={ai} />
        </main>
      </div>
    )
  if (!profileLoaded) return <div className="app bare" />
  if (!profile || screen === 'onboarding')
    return (
      <div className="app bare">
        <main className="main">
          <ProfileScreen />
        </main>
      </div>
    )

  let body: React.JSX.Element
  if (screen === 'today' || screen === 'weekly' || screen === 'monthly') body = <TodayScreen />
  else body = <LogScreen />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">{body}</main>
    </div>
  )
}

export default App
