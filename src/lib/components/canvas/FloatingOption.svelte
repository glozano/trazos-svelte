<script>
    import { onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import {openModals} from '$lib/stores/boardStore';

    export let active = true;
    let optionsVisible = false;
    let wrapper;

    function toggleOptionsVisibility(){
        optionsVisible = !optionsVisible;
        if(optionsVisible){
            $openModals = $openModals + 1;
            // document.addEventListener('touchstart', handleOutsideClick);
            document.addEventListener('click', handleOutsideClick);
        }else{
            $openModals = $openModals - 1;
            // document.removeEventListener('touchstart', handleOutsideClick);
            document.addEventListener('click', handleOutsideClick);
        }
    }

    function handleOutsideClick(event) {
        if (optionsVisible && wrapper && !wrapper.contains(event.target)) {
            toggleOptionsVisibility();
        }
    }
    
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
    }
    :global(.floating-left .floating-opt-wrapper){
        width: unset;
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