// Read-aloud, all on this computer. First choice is the operating system's speech engine run by the
// main process (Windows SAPI, macOS say); the browser's own voices are the backup.
export const canSpeak = (): boolean => true

function webSpeak(text: string, onEnd?: () => void): void {
  if (typeof speechSynthesis === 'undefined') return onEnd?.()
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = speechSynthesis.getVoices()
  const v = voices.find((x) => /^fil|^tl/i.test(x.lang)) ?? voices.find((x) => /^en/i.test(x.lang))
  if (v) {
    u.voice = v
    u.lang = v.lang
  }
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}

export function speak(text: string, onEnd?: () => void): void {
  window.vox.tts.speak(text).then(
    () => onEnd?.(),
    () => webSpeak(text, onEnd)
  )
}

export function stopSpeaking(): void {
  void window.vox.tts.stop()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

const KEY = 'vox.autoRead'
export function getAutoRead(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
export function setAutoRead(v: boolean): void {
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}
