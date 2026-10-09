import mark from '../assets/logo-mark.png'

// The panther mark and wordmark used in the sidebar, onboarding and error screens.
export function Brand({ upper = false }: { upper?: boolean }): React.JSX.Element {
  return (
    <div className="brand">
      <img src={mark} alt="" />
      <span>{upper ? 'VOX' : 'vox'}</span>
    </div>
  )
}
