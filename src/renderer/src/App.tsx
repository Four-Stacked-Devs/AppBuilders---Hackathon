import { useEffect } from 'react'
import { useVox } from './store'
import { Sidebar } from './components/Sidebar'
import { Setup } from './screens/Setup'
import { Onboarding } from './screens/Onboarding'
import { Talk } from './screens/Talk'
import { Dashboard } from './screens/Dashboard'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'

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
          <Onboarding />
        </main>
      </div>
    )

  let body: React.JSX.Element
  if (screen === 'today' || screen === 'weekly' || screen === 'monthly')
    body = <Dashboard key={screen} tab={screen} />
  else if (screen === 'progress') body = <Progress />
  else if (screen === 'settings') body = <Settings />
  else body = <Talk />

  return (
    <div className="app">
      <Sidebar />
      <main className="main">{body}</main>
    </div>
  )
}

export default App
