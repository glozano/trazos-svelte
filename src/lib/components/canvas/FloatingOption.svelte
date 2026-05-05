<script>
    import { onDestroy } from 'svelte';
    import {openModals} from '$lib/stores/boardStore';

    export let active = true;
    let optionsVisible = false;
    let wrapper;

    function syncModalState(isOpen){
        if (isOpen) {
            $openModals = $openModals + 1;
            document.addEventListener('click', handleOutsideClick);
        } else {
            $openModals = $openModals - 1;
            document.removeEventListener('click', handleOutsideClick);
        }
    }

    export function closeOptions() {
        if (!optionsVisible) {
            return;
        }

        optionsVisible = false;
        syncModalState(false);
    }

    function toggleOptionsVisibility(){
        optionsVisible = !optionsVisible;
        syncModalState(optionsVisible);
    }

    function handleOutsideClick(event) {
        if (optionsVisible && wrapper && !wrapper.contains(event.target)) {
            closeOptions();
        }
    }

    onDestroy(() => {
        document.removeEventListener('click', handleOutsideClick);
    });
    
</script>


<div class="floating-opt-wrapper" bind:this={wrapper}>
    {#if optionsVisible}
        <slot name="optionSelector"></slot>
    {/if}
    <div class="floating-opt" on:click={toggleOptionsVisibility} >
        <slot name="selectedOption"></slot>
    </div>
</div>

<style>
    :global(.floating-opt){
        display: flex;
        background-color: #212125;
        border-radius: 100%;
        width: 45px;
        height: 45px;
        margin: 8px;
        padding: 4px;
        border: 0.5px solid rgba(128, 128, 128, 0.634);
        cursor: pointer;
    }
    :global(.floating-opt-wrapper){
        width: 70px;
        position: relative;
    }
    .floating-opt img{
        width: 100%;
    }
    .selected-option{
        width:100%;
        height: 100%;
        border-radius: 100%;
    }
    :global( [slot="selectedOption"] ) { 
        width: 100%;
        height: 100%;
        display: flex;
    }
    :global( [slot="selectedOption"] img) { 
        width: 100%;
    }
</style>
