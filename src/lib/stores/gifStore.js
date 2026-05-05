import { writable } from 'svelte/store';

export const gifStore = writable({
    createGif: null
});

export function registerGifCreator(createGif) {
    gifStore.update((state) => ({
        ...state,
        createGif
    }));

    return () => {
        gifStore.update((state) => {
            if (state.createGif !== createGif) return state;
            return {
                ...state,
                createGif: null
            };
        });
    };
}
