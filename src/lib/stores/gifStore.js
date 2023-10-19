import { writable } from 'svelte/store';

export const gifStore = writable({
    triggerCreateGif: null
});