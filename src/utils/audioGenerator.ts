/**
 * Audio stubs utility.
 * Extra sound effects, continuous oscillator drones and bells have been completely removed
 * to guarantee silence and eliminate buzzing or vibrations.
 */

export function getTibetanBellWavUrl(): string {
  return '';
}

export function getTanpuraDroneWavUrl(): string {
  return '';
}

export function playNativeBellAudio(_volume: number = 0.85): HTMLAudioElement | null {
  return null;
}

export function startNativeTanpuraDrone(_volume: number = 0.7): HTMLAudioElement | null {
  return null;
}

export function stopNativeTanpuraDrone(): void {
  // Silence guaranteed
}

export function setNativeTanpuraVolume(_volume: number): void {
  // No-op
}
