import { spawn, type ChildProcess } from 'node:child_process'

// Text to speech with the operating system's own voices. Everything stays on this computer:
// Windows SAPI, macOS `say`, Linux espeak. The text goes in through the environment, never a command line.
let current: ChildProcess | null = null

const WIN_SCRIPT =
  "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
  "$s.Rate = 0; $t = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:VOX_TTS)); $s.Speak($t)"

export function stopSpeaking(): void {
  if (current && !current.killed) current.kill()
  current = null
}

export function speakText(text: string): Promise<void> {
  stopSpeaking()
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 1500)
  if (!clean) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const env = { ...process.env, VOX_TTS: Buffer.from(clean, 'utf8').toString('base64') }
    let child: ChildProcess
    if (process.platform === 'win32') {
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', WIN_SCRIPT], { env, windowsHide: true })
    } else if (process.platform === 'darwin') {
      child = spawn('say', [clean])
    } else {
      child = spawn('espeak', [clean])
    }
    current = child
    child.on('error', (e) => reject(e))
    child.on('exit', (code, signal) => {
      if (current === child) current = null
      if (code === 0 || signal) resolve()
      else reject(new Error('speech failed'))
    })
  })
}
