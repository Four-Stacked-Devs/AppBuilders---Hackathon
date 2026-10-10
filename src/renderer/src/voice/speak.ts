// Read-aloud with the operating system's own voices (works offline, nothing is sent anywhere).
export const canSpeak = (): boolean => typeof speechSynthesis !== 'undefined'

export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = speechSynthesis.getVoices()
  const v = voices.find((x) => /^fil|^tl/i.test(x.lang)) ?? voices.find((x) => /^en/i.test(x.lang))
  if (v) {
    u.voice = v
    u.lang = v.lang
  }
  u.rate = 1
  u.onend = () => onEnd?.()
  u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}

export const stopSpeaking = (): void => {
  if (canSpeak()) speechSynthesis.cancel()
}
