import { writable } from 'svelte/store';
import {LOOPING_AT_INIT,FIXED_STROKE_AT_INIT,DISSAPEARING_AT_INIT} from '$lib/andiamo/parameters'
import HashMap from '$lib/andiamo/hashmap'
import MultiMap from '$lib/andiamo/multimap'

// export const gestures = writable({
//     current: null,
//     prev: null,
// })
export const p = writable(null);
export const canvas = writable(null);
export const currentGesture = writable(null);
export const prevGesture = writable(null);

export const otherGestures = writable([
    new MultiMap(),
    new MultiMap(), 
    new MultiMap(), 
    new MultiMap()
]);

// export const otherRibbons = writable(new HashMap());

export const currentRibbon = writable(null)

export const layers = writable([[], [], [], []]);

export const openModals = writable(0);

export const canvasParams = writable({
    looping: false,
    fixed: false,
    dissapearing: false,
    grouping: false,
    color: [175, 0, 255],
    loopMultiplier: 5,
    ribbonWidth: 0.4,
    alpha: 255,
    alphaScale: [],
    layer: 0
});

export function reset() {
    canvasParams.set({
        looping: LOOPING_AT_INIT,
        fixed: FIXED_STROKE_AT_INIT,
        dissapearing: DISSAPEARING_AT_INIT,
        grouping: false,
        color: [175, 0, 255],
        alpha: 255,
        loopMultiplier: 5,
        ribbonWidth: 0.4,
        alphaScale: [1, 1, 1, 1],
        layer: 0
    })
}