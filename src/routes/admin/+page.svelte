<script>
    import { onDestroy, onMount } from 'svelte';
    import { io } from 'socket.io-client';

    let username = '';
    let password = '';
    let admin = null;
    let loading = true;
    let error = '';
    let actionMessage = '';
    let socket = null;
    let state = {
        totals: {
            onlineBoards: 0,
            onlineUsers: 0,
            activeStrokes: 0,
            completedStrokes: 0,
            rawEvents: 0
        },
        boards: []
    };
    let selectedBoardId = '';

    $: selectedBoard = selectedBoardId
        ? state.boards.find((board) => board.id === selectedBoardId) || null
        : null;

    onMount(async () => {
        await loadSession();
        loading = false;
    });

    onDestroy(() => {
        disconnectAdminSocket();
    });

    async function loadSession() {
        const response = await fetch('/admin/api/session');
        const session = await response.json();
        if (session.authenticated) {
            admin = session;
            connectAdminSocket();
        }
    }

    async function login() {
        error = '';
        actionMessage = '';
        const response = await fetch('/admin/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (!response.ok) {
            error = loginErrorMessage(result.error);
            return;
        }
        admin = result;
        password = '';
        connectAdminSocket();
    }

    async function logout() {
        await fetch('/admin/api/logout', { method: 'POST' });
        admin = null;
        disconnectAdminSocket();
    }

    function connectAdminSocket() {
        disconnectAdminSocket();
        socket = io({ query: { admin: '1' } });
        socket.on('admin:state', (nextState) => {
            state = nextState;
            if (selectedBoardId && !nextState.boards.some((board) => board.id === selectedBoardId)) {
                selectedBoardId = '';
            }
        });
        socket.on('admin:error', () => {
            error = 'La sesión de administración no es válida';
            admin = null;
            disconnectAdminSocket();
        });
        socket.on('disconnect', () => {
            if (admin) actionMessage = 'Panel desconectado. Reconectando...';
        });
        socket.on('connect', () => {
            actionMessage = '';
        });
    }

    function disconnectAdminSocket() {
        if (!socket) return;
        socket.disconnect();
        socket = null;
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('es-AR');
    }

    function formatDate(value) {
        if (!value) return 'Sin eventos';
        return new Date(value).toLocaleString('es-AR', {
            dateStyle: 'short',
            timeStyle: 'medium'
        });
    }

    function loginErrorMessage(code) {
        if (code === 'invalid_credentials') return 'Usuario o contraseña incorrectos';
        if (code === 'missing_credentials') return 'Completa usuario y contraseña';
        if (code === 'mongo_unavailable') return 'Mongo no está disponible';
        return 'No se pudo iniciar sesión';
    }

    function toggleBoard(boardId) {
        selectedBoardId = selectedBoardId === boardId ? '' : boardId;
    }

    function eraseBoard(board) {
        if (!socket || !board) return;
        if (!confirm(`Borrar todos los trazos del tablero ${board.id}?`)) return;
        actionMessage = 'Borrando tablero...';
        socket.emit('admin:erase-board', { board: board.id }, (result) => {
            actionMessage = result?.ok
                ? `Tablero borrado: ${formatNumber(result.deleted)} eventos`
                : 'No se pudo borrar el tablero';
        });
    }

    function eraseUser(board, user) {
        if (!socket || !board || !user?.trazosId) return;
        if (!confirm(`Borrar los trazos de ${user.displayName} en ${board.id}?`)) return;
        actionMessage = 'Borrando usuario...';
        socket.emit('admin:erase-user', { board: board.id, trazosId: user.trazosId }, (result) => {
            actionMessage = result?.ok
                ? `Usuario borrado: ${formatNumber(result.deleted)} eventos`
                : 'No se pudo borrar el usuario';
        });
    }
</script>

<svelte:head>
    <title>Administración | Trazos</title>
</svelte:head>

{#if loading}
    <main class="admin-shell">
        <p class="muted">Cargando...</p>
    </main>
{:else if !admin}
    <main class="login-shell">
        <form class="login-panel" on:submit|preventDefault={login}>
            <div>
                <p class="eyebrow">Administración de Trazos</p>
                <h1>Ingresar</h1>
            </div>
            <label>
                Usuario
                <input bind:value={username} autocomplete="username" required />
            </label>
            <label>
                Contraseña
                <input bind:value={password} type="password" autocomplete="current-password" required />
            </label>
            {#if error}<p class="error">{error}</p>{/if}
            <button type="submit">Entrar</button>
        </form>
    </main>
{:else}
    <main class="admin-shell">
        <header class="admin-header">
            <div>
                <p class="eyebrow">Administración de Trazos</p>
                <h1>Tableros en vivo</h1>
            </div>
            <div class="session">
                <span>{admin.username}</span>
                <button class="ghost" on:click={logout}>Salir</button>
            </div>
        </header>

        {#if actionMessage}
            <p class="notice">{actionMessage}</p>
        {/if}

        <section class="metrics" aria-label="Métricas generales">
            <div><strong>{formatNumber(state.totals.onlineBoards)}</strong><span>tableros</span></div>
            <div><strong>{formatNumber(state.totals.onlineUsers)}</strong><span>usuarios</span></div>
            <div><strong>{formatNumber(state.totals.activeStrokes)}</strong><span>dibujando</span></div>
            <div><strong>{formatNumber(state.totals.completedStrokes)}</strong><span>trazos</span></div>
            <div><strong>{formatNumber(state.totals.rawEvents)}</strong><span>eventos sin procesar</span></div>
        </section>

        <section class="workbench">
            <h2 class="section-title">Tableros online ({formatNumber(state.boards.length)})</h2>
            <div class="panel">
                <div class="table boards">
                    <div class="row head">
                        <span>Tablero</span>
                        <span>Usuarios</span>
                        <span>Dibujando</span>
                        <span>Trazos</span>
                        <span>Eventos</span>
                        <span>Creado</span>
                        <span>Último evento</span>
                    </div>
                    {#each state.boards as board}
                        <button
                            type="button"
                            class:selected={selectedBoard?.id === board.id}
                            class="row board-row"
                            on:click={() => toggleBoard(board.id)}
                            aria-expanded={selectedBoard?.id === board.id}
                        >
                            <span>{board.id}</span>
                            <span>{formatNumber(board.onlineUsers)}</span>
                            <span>{formatNumber(board.activeStrokes)}</span>
                            <span>{formatNumber(board.completedStrokes)}</span>
                            <span>{formatNumber(board.rawEvents)}</span>
                            <span>{formatDate(board.createdAt)}</span>
                            <span>{formatDate(board.lastEventAt)}</span>
                        </button>
                    {:else}
                        <p class="empty">No hay tableros en línea.</p>
                    {/each}
                </div>
            </div>

            {#if selectedBoard}
                <h2 class="section-title detail-title">Detalle de tablero</h2>
                <div class="panel detail">
                    <div class="detail-summary">
                        <div class="detail-main">
                            <p class="detail-label">Tablero</p>
                            <h2>{selectedBoard.id}</h2>
                        </div>
                        <div class="detail-meta">
                            <div>
                                <span>Creado</span>
                                <strong>{formatDate(selectedBoard.createdAt)}</strong>
                            </div>
                            <div>
                                <span>Último evento</span>
                                <strong>{formatDate(selectedBoard.lastEventAt)}</strong>
                            </div>
                        </div>
                        <div class="detail-layer-block">
                            <p class="detail-label">Trazos por capa</p>
                            <div class="layers" aria-label="Trazos por capa">
                                {#each selectedBoard.layers as count, index}
                                    <span class="layer-chip"><b>Capa {index + 1}</b>{formatNumber(count)}</span>
                                {/each}
                            </div>
                        </div>
                        <div class="panel-actions">
                            <button class="ghost" on:click={() => selectedBoardId = ''}>Cerrar</button>
                            <button class="danger" on:click={() => eraseBoard(selectedBoard)}>Borrar tablero</button>
                        </div>
                    </div>

                    <div class="table users">
                        <div class="row head">
                            <span>Usuario</span>
                            <span>Sistema</span>
                            <span>Activo</span>
                            <span>Trazos</span>
                            <span>Eventos</span>
                            <span>Último evento</span>
                            <span>Capas</span>
                            <span></span>
                        </div>
                        {#each selectedBoard.users as user}
                            <div class="row user-row">
                                <span title={user.socketId}>{user.displayName}</span>
                                <span>{user.ua}</span>
                                <span>{user.activeStroke ? 'sí' : 'no'}</span>
                                <span>{formatNumber(user.completedStrokes)}</span>
                                <span>{formatNumber(user.rawEvents)}</span>
                                <span>{formatDate(user.lastEventAt)}</span>
                                <span class="layers compact">
                                    {#each user.layers as count, index}
                                        <span class="layer-chip"><b>C{index + 1}</b>{formatNumber(count)}</span>
                                    {/each}
                                </span>
                                <span><button class="danger ghost" on:click={() => eraseUser(selectedBoard, user)}>Borrar</button></span>
                            </div>
                        {:else}
                            <p class="empty">Sin usuarios conectados.</p>
                        {/each}
                    </div>
                </div>
            {/if}
        </section>
    </main>
{/if}

<style>
    :global(body) {
        --md-primary: #00ff00;
        --md-on-primary: #071006;
        --md-surface: #060a0f;
        --md-surface-container: #0b1115;
        --md-surface-container-high: #111a1f;
        --md-on-surface: #f3f4f2;
        --md-on-surface-variant: #babcbe;
        --md-outline: #26332d;
        --md-outline-variant: #17221d;
        --md-error: #ff4f64;
        --md-on-error: #130407;
        --md-error-container: #341117;
        --md-on-error-container: #ffb6bf;
        margin: 0;
        background: var(--md-surface);
        color: var(--md-on-surface);
        font-family: "Roboto Mono", monospace;
    }

    button,
    input {
        font: inherit;
    }

    button {
        border: 1px solid transparent;
        border-radius: 6px;
        background: var(--md-primary);
        color: var(--md-on-primary);
        cursor: pointer;
        min-height: 34px;
        padding: 0 12px;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    button.ghost {
        background: transparent;
        border-color: var(--md-outline);
        color: var(--md-primary);
    }

    button.danger {
        background: var(--md-error);
        color: var(--md-on-error);
    }

    button.danger.ghost {
        background: var(--md-error-container);
        border-color: transparent;
        color: var(--md-on-error-container);
    }

    button:hover,
    button:focus-visible {
        filter: brightness(1.08);
    }

    button:focus-visible,
    input:focus-visible {
        outline: 2px solid var(--md-primary);
        outline-offset: 2px;
    }

    .login-shell,
    .admin-shell {
        min-height: 100vh;
        box-sizing: border-box;
    }

    .login-shell {
        display: grid;
        place-items: center;
        padding: 24px;
    }

    .login-panel {
        width: min(360px, 100%);
        border-radius: 8px;
        background: var(--md-surface-container);
        padding: 24px;
        display: grid;
        gap: 16px;
    }

    .login-panel h1,
    .admin-header h1,
    .panel h2 {
        margin: 0;
        line-height: 1;
    }

    .login-panel label {
        display: grid;
        gap: 6px;
        color: var(--md-on-surface-variant);
        font-size: 13px;
    }

    .login-panel input {
        border: 1px solid var(--md-outline);
        border-radius: 6px;
        background: var(--md-surface);
        color: var(--md-on-surface);
        min-height: 36px;
        padding: 0 10px;
    }

    .admin-shell {
        width: min(1080px, calc(100% - 32px));
        margin: 0 auto;
        padding: 24px 0;
    }

    .admin-header,
    .session {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .eyebrow,
    .muted,
    .empty,
    .notice {
        color: var(--md-on-surface-variant);
        margin: 0;
        font-size: 12px;
    }

    .eyebrow {
        color: var(--md-primary);
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 6px;
    }

    .error {
        color: var(--md-on-error-container);
        margin: 0;
        font-size: 13px;
    }

    .notice {
        margin-top: 12px;
        color: var(--md-primary);
    }

    .metrics {
        display: grid;
        grid-template-columns: repeat(5, minmax(120px, 1fr));
        gap: 8px;
        margin: 18px 0;
    }

    .metrics div,
    .panel {
        background: var(--md-surface-container);
    }

    .metrics div {
        border-radius: 8px;
        padding: 12px;
        display: grid;
        gap: 4px;
    }

    .metrics strong {
        color: var(--md-primary);
        font-size: 24px;
        line-height: 1;
    }

    .metrics span {
        color: var(--md-on-surface-variant);
        font-size: 12px;
    }

    .workbench {
        display: grid;
        gap: 10px;
        align-items: start;
    }

    .section-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
    }

    .detail-title {
        margin-top: 12px;
    }

    .panel {
        min-width: 0;
        border-radius: 8px;
        padding: 12px;
    }

    .detail {
        padding: 20px;
    }

    .detail-summary {
        display: grid;
        grid-template-columns: minmax(180px, .7fr) minmax(260px, 1fr) minmax(260px, 1fr) auto;
        gap: 20px;
        align-items: start;
    }

    .detail-main h2 {
        margin: 4px 0 0;
        line-height: 1.1;
    }

    .detail-label {
        color: var(--md-on-surface-variant);
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .08em;
    }

    .detail-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(120px, 1fr));
        gap: 10px;
    }

    .detail-meta div {
        border-radius: 8px;
        background: var(--md-surface-container-high);
        padding: 12px;
        display: grid;
        gap: 6px;
    }

    .detail-meta span {
        color: var(--md-on-surface-variant);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .06em;
    }

    .detail-meta strong {
        color: var(--md-on-surface);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
    }

    .detail-layer-block {
        min-width: 0;
    }

    .panel-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .table {
        margin-top: 12px;
        overflow: auto;
    }

    .detail .table {
        margin-top: 20px;
    }

    .row {
        display: grid;
        align-items: center;
        gap: 10px;
        min-width: 0;
        min-height: 34px;
        border-top: 1px solid var(--md-outline-variant);
        color: var(--md-on-surface);
        text-align: left;
        width: 100%;
        box-sizing: border-box;
    }

    .row span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .row.head {
        color: var(--md-on-surface-variant);
        font-size: 11px;
        text-transform: uppercase;
        border-top: 0;
    }

    .boards .row {
        grid-template-columns: minmax(110px, 1fr) 72px 86px 80px 82px minmax(128px, 1fr) minmax(128px, 1fr);
    }

    .board-row {
        background: transparent;
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
        border-color: var(--md-outline-variant);
        border-radius: 0;
        color: var(--md-on-surface);
        min-height: 38px;
        padding: 0 8px;
    }

    .board-row.selected,
    .board-row:hover {
        background: var(--md-surface-container-high);
        color: var(--md-primary);
    }

    .users .row {
        grid-template-columns: minmax(120px, 1fr) minmax(90px, .7fr) 62px 70px 82px minmax(132px, 1fr) minmax(190px, 1fr) 76px;
    }

    .layers {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
    }

    .layers.compact {
        margin-top: 0;
        gap: 4px;
    }

    .row span.layers {
        overflow: visible;
        white-space: normal;
    }

    .layer-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        background: var(--md-surface-container-high);
        color: var(--md-on-surface);
        padding: 4px 8px;
        font-size: 12px;
        line-height: 1;
        white-space: nowrap;
    }

    .row .layer-chip {
        overflow: visible;
        text-overflow: clip;
    }

    .layer-chip b {
        color: var(--md-primary);
        font-weight: 700;
    }

    @media (max-width: 940px) {
        .metrics,
        .workbench {
            grid-template-columns: 1fr;
        }

        .detail-summary,
        .detail-meta {
            grid-template-columns: 1fr;
        }

        .detail {
            padding: 16px;
        }

        .detail {
            padding: 16px;
        }
    }
</style>
