// Mock mode (VOX_FAKE_LLM=1): canned replies so UI work doesn't need the 2 GB model loaded.
export async function fakeGenerate(opts: { jsonSchema?: object }): Promise<string> {
  await new Promise((r) => setTimeout(r, 400))
  if (opts.jsonSchema) {
    return JSON.stringify({
      foods: [
        { name: 'kanin', quantity: 2, unit: 'cup' },
        { name: 'adobong manok', quantity: 1, unit: 'serving' }
      ],
      exercises: [{ activity: 'jogging', durationMin: 30, effort: 'moderate' }],
      sleepHours: 0,
      waterGlasses: 0,
      bodyWeightKg: 0,
      unclear: []
    })
  }
  return 'Ayos! Solid yung jog mo today. Inom ka ng tubig tapos pahinga nang maayos mamaya.'
}
