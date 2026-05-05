import { writable } from 'svelte/store';

const CANVAS_USERNAME_KEY = 'trazos.canvas.username';

export const canvasUsername = writable('');

export function loadCanvasUsername() {
  if (typeof window === 'undefined') return '';
  const stored = window.localStorage.getItem(CANVAS_USERNAME_KEY);
  const normalized = typeof stored === 'string' ? stored.trim() : '';
  canvasUsername.set(normalized);
  return normalized;
}

export function saveCanvasUsername(username) {
  const normalized = typeof username === 'string' ? username.trim() : '';
  if (typeof window !== 'undefined') {
    if (normalized) {
      window.localStorage.setItem(CANVAS_USERNAME_KEY, normalized);
    } else {
      window.localStorage.removeItem(CANVAS_USERNAME_KEY);
    }
  }
  canvasUsername.set(normalized);
  return normalized;
}
