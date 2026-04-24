import { browser } from '$app/environment';
import { writable } from 'svelte/store';

const STORAGE_KEY = 'trazos.language';
const DEFAULT_LANGUAGE = 'es';

function normalizeLanguage(value) {
  return value === 'en' ? 'en' : 'es';
}

function createLanguageStore() {
  const { subscribe, set } = writable(DEFAULT_LANGUAGE);

  if (browser) {
    const storedLanguage = localStorage.getItem(STORAGE_KEY);
    set(normalizeLanguage(storedLanguage));
  }

  return {
    subscribe,
    set: (language) => {
      const normalizedLanguage = normalizeLanguage(language);
      if (browser) {
        localStorage.setItem(STORAGE_KEY, normalizedLanguage);
      }
      set(normalizedLanguage);
    }
  };
}

export const languageStore = createLanguageStore();
