// Records from the microphone and returns 16 kHz mono samples, the format Whisper expects.
// Decoding into a 16 kHz AudioContext does the resampling.
export async function startRecording(): Promise<() => Promise<Float32Array>> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
  })
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => chunks.push(e.data)
  rec.start()

  return async function stop() {
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
      rec.stop()
    })
    stream.getTracks().forEach((t) => t.stop())
    const ctx = new AudioContext({ sampleRate: 16_000 })
    try {
      const audio = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())
      return audio.getChannelData(0)
    } finally {
      await ctx.close()
    }
  }
}
