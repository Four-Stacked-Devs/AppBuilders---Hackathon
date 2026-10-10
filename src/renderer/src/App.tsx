import { useEffect, useState } from 'react'
import { useVox, type Screen } from './store'
import { Sidebar } from './components/Sidebar'
import { Splash } from './components/Splash'
import { Onboarding } from './screens/Onboarding'
import { Calendar } from './screens/Calendar'
import { Coach } from './screens/Coach'
import { Diary } from './screens/Diary'
import { Home } from './screens/Home'
import { Plans } from './screens/Plans'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'

function App(): React.JSX.Element {
  const { screen, setAi, ai, profile, profileLoaded, setProfile } = useVox()
  const [skipSplash, setSkipSplash] = useState(false)

  useEffect(() => {
    const off = window.vox.ai.onStatus(setAi)
    window.vox.ai.status().then(setAi)
    window.vox.profile.get().then(setProfile)
    const offQuick = window.vox.app.onQuickCapture(() => useVox.getState().setScreen('coach'))
    return () => {
      off()
      offQuick()
    }
  }, [setAi, setProfile])

  if (ai.state === 'loading' && !skipSplash)
    return <Splash status={ai} onSkip={() => setSkipSplash(true)} />
  if (!profileLoaded) return <div className="app bare" />
  if (!profile || screen === 'onboarding')
    return (
      <div className="app bare">
        <main className="main">
          <Onboarding />
        </main>
      </div>
    )

  const body: Record<Exclude<Screen, 'onboarding'>, React.JSX.Element> = {
    home: <Home />,
    coach: <Coach />,
    diary: <Diary />,
    calendar: <Calendar />,
    progress: <Progress />,
    plans: <Plans />,
    settings: <Settings />
  }

  return (
    <div className="app">
      <Sidebar />
      <main className="main" key={screen}>
        {body[screen as Exclude<Screen, 'onboarding'>]}
      </main>
    </div>
  )
}

export default App
