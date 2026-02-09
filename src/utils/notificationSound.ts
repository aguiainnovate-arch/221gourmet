/**
 * Reproduz um som curto de notificação (beep) para novo pedido.
 * Usa Web Audio API para não depender de arquivo externo.
 */
export function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Fallback silencioso se AudioContext não estiver disponível (ex.: autoplay bloqueado)
  }
}

const STORAGE_KEY_PREFIX = 'delivery_notification_sound_';

export function getNotificationSoundEnabled(restaurantId: string): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY_PREFIX + restaurantId);
    return v !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(restaurantId: string, enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + restaurantId, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}
