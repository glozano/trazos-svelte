
<script>
    import { fade } from 'svelte/transition';
    import Textfield, {Input} from '@smui/textfield';
    import Dialog, { Title, Content, Actions } from '@smui/dialog';
    import Button, { Label } from '@smui/button';
    import IconButton from '@smui/icon-button';
    import { page } from '$app/stores';
    import {socket} from '$lib/stores/socketStore';
    import { onMount } from 'svelte';

    export let showDialog = false;
    export let unreadNum = 0;
    
    onMount(() => {
        $socket.on('chat login', (data)=>chatLogin(data));
        $socket.on('chat logout', (data)=>chatLogout(data));
        $socket.on('new message', (data)=>newMessage(data));
        $socket.on('user joined', (data)=>newUser(data));
        $socket.on('typing', (data)=>userTyping(data));
        $socket.on('stop typing', (data)=>userStopTyping(data));
    });

    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
        '#ff1500', '#ff9e1c', '#ffac00', '#ff8f00',
        '#58dc00', '#52ff00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#5435ff', '#a700ff', '#d300e7'
    ];
    let typing = false;
    let lastTypingTime;
    let usersMsg = "";
    let messages = [];
    let userIsTyping = [];
    let chatInput;
    let connected = false;
    let chatMsg = "";
    let username = "";
    let usernameInvalid = false;
    let usernameValidated = false;
    
    function enterChat(){
        if(username == ""){
            usernameInvalid = true;
        }else{
            usernameInvalid = false;
            usernameValidated = true;
            $socket.emit('add user', username);
            setTimeout(()=>chatInput.focus(),200);
        }
    }

    // Socket observers

    function chatLogin(data){
        console.log(data.username + ' entered');
        connected = true;
        updateParticipants(data);
    }

    function chatLogout(data){
        console.log(data.username + ' left');
        updateParticipants(data);
        userIsTyping = userIsTyping.filter(e => e !== data.username);
    }

    function newMessage(data){
        addUnreadMsg();
        addChatMessage(data);
    }

    function newUser(data){
        // console.log(data.username + ' joined');
        updateParticipants(data);
    }

    function userTyping(data){
        userIsTyping = [...userIsTyping,data.username];
    }

    function userStopTyping(data){
        userIsTyping = userIsTyping.filter(e => e !== data.username);
    }

    function updateParticipants(data){
        let usernames = data.usernames.join(", ");
        if (data.numUsers === 1) {
            usersMsg = "¡Estas solx por ahora!";
        }else{
            usersMsg = "Hay " + data.numUsers + " participantes activos: " + usernames ;
        }
    }

    function sendMessage(message) {
        // message = cleanInput(message);
        if (message && connected) {
            addChatMessage({
                username: username,
                text: message
            });
            $socket.emit('new message', message);
            chatMsg = "";
            setTimeout(()=>chatInput.focus(),200);
        }
    }

    function addChatMessage (msg) {
        messages = [...messages,msg];
    }

    // Updates the typing event
    function updateTyping () {
        if (connected) {
            if (!typing) {
                typing = true;
                $socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    $socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }

    // Gets the color of a username through our hash function
    function getUsernameColor(username) {
        // Compute hash code
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // Calculate color
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }

    function addUnreadMsg(){
        if(!showDialog){
            unreadNum++;
        }
    }
</script>

<Dialog bind:open={showDialog} >
    <!-- <Title>Chat</Title> -->
    {#if !usernameValidated}
        <Content>
            <form class="pick-username">
                <span>Escoge un sobrenombre e ingresa al chat</span>
                <Textfield
                    class="shaped-outlined"
                    variant="outlined"
                    bind:invalid={usernameInvalid}
                    bind:value={username}
                    label="Sobrenombre">
                    <!-- <HelperText slot="helper">Helper Text</HelperText> -->
                </Textfield>
                <Button variant="raised" on:click={enterChat}>
                    <Label>Ingresar</Label>
                </Button>
            </form>
        </Content>
    {:else}
        <div class="chat-dialog">
            <div class="chat-header info">
                <Content>
                    <div class="welcome-msg">
                        Bienvenidx al chat de Trazos club! Estas en el tablero: {$page.params.room}
                    </div>
                    <div class="ppl">{usersMsg}</div>
                </Content>
            </div>
            <ul class="conversation messages">
                {#each messages as msg}
                    <li class="message" in:fade={{ delay: 50, duration: 300 }}>
                        <span class="username" style={`color:${getUsernameColor(msg.username)}`}>{msg.username}</span>
                        <span class="messageBody">{msg.text}</span>
                    </li>
                {/each}
                {#each userIsTyping as typingName}
                    <li class="message" transition:fade={{ delay: 50, duration: 300 }}>
                        <span class="username" style={`color:${getUsernameColor(typingName)}`}>{typingName}</span>
                        <span class="messageBody">is typing...</span>
                    </li>
                {/each}
            </ul>
            <Content>
                <form class="chat-input" on:submit={()=>sendMessage(chatMsg)}>
                    <!-- bind:chatInput
                    on:keydown={handleKeyDown} -->
                    <Textfield
                        bind:this={chatInput}
                        bind:value={chatMsg}
                        on:input={updateTyping}
                        placeholder="Escribe un mensaje"
                        variant="filled"
                    />
                    <IconButton class="material-icons send" on:click={()=>sendMessage(chatMsg)}>send</IconButton>
                </form>
            </Content>
            
        </div>
    {/if}
    
</Dialog>
<style>
    /* Chat */
    .pick-username{
        display: flex;
        flex-direction: column;
    }
    :global(.pick-username label){
        margin-top: 16px;
        margin-bottom: 16px;
    }
    :global(.chat-header .mdc-dialog__content){
        padding-bottom:0;
    }
    /* background-color: #2a2a2e; */
    .conversation{
        background-color: black;
        height: 50vh;
        padding-top: 16px;
        padding-left: 24px;
        padding-bottom: 8px;
        font-family: 'Roboto';
        overflow: scroll;
        margin-bottom: 0;
    }
    .conversation li{
        list-style: none;
        padding: 4px 0;
    }
    .conversation .username{
        padding-right: 8px; 
    }
    .ppl{
        color: white;
        font-weight: 400;
        padding-top: 8px;
        font-style: italic;
    }
    :global(.material-icons.send){
        background-color: #00FF00;
        color: #2a2a2e;
        border-radius: 100%;
    }
    .chat-input{
        display: flex;
    }
    :global(.chat-input label){
        width: 100%;
        margin-right: 16px;
    }
</style>