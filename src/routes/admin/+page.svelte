<script>
    import { onDestroy, onMount } from 'svelte';
    import { io } from 'socket.io-client';

    const liveModeParams = [
        { id: 'density', kind: 'range', min: 0.6, max: 1.4, step: 0.05, default: 1, label: 'Density' }
    ];
    const liveModeParamsJson = JSON.stringify(liveModeParams);

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
    let featureBoardId = '';
    let autoEraseEnabled = false;
    let autoEraseMaxTrazos = 500;
    let featureDirty = false;
    let featureSaving = false;

    $: selectedBoard = selectedBoardId
        ? state.boards.find((board) => board.id === selectedBoardId) || null
        : null;

    $: syncFeatureDraft(selectedBoard);

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

    function boardAutoEraseFeature(board) {
        return board?.features?.autoEraseOldTrazos || { enabled: false, maxTrazos: 500 };
    }

    function syncFeatureDraft(board) {
        if (!board) {
            featureBoardId = '';
            autoEraseEnabled = false;
            autoEraseMaxTrazos = 500;
            featureDirty = false;
            featureSaving = false;
            return;
        }

        const feature = boardAutoEraseFeature(board);
        const incomingMax = Number(feature.maxTrazos || 500);
        const shouldSync = board.id !== featureBoardId
            || (!featureDirty && !featureSaving && (
                autoEraseEnabled !== Boolean(feature.enabled)
                || autoEraseMaxTrazos !== incomingMax
            ));

        if (!shouldSync) return;
        featureBoardId = board.id;
        autoEraseEnabled = Boolean(feature.enabled);
        autoEraseMaxTrazos = incomingMax;
        featureDirty = false;
        featureSaving = false;
    }

    function updateAutoEraseEnabled(value) {
        autoEraseEnabled = value;
        featureDirty = true;
    }

    function updateAutoEraseMax(value) {
        autoEraseMaxTrazos = value;
        featureDirty = true;
    }

    function saveBoardFeatures(board) {
        if (!socket || !board || featureSaving) return;

        let maxTrazos = Number(autoEraseMaxTrazos);
        if (autoEraseEnabled && (!Number.isInteger(maxTrazos) || maxTrazos < 1 || maxTrazos > 10000)) {
            actionMessage = 'El máximo de trazos debe estar entre 1 y 10000';
            return;
        }
        if (!autoEraseEnabled && (!Number.isInteger(maxTrazos) || maxTrazos < 1 || maxTrazos > 10000)) {
            maxTrazos = 500;
        }

        featureSaving = true;
        actionMessage = 'Guardando funciones del tablero...';
        socket.emit('admin:update-board-features', {
            board: board.id,
            features: {
                autoEraseOldTrazos: {
                    enabled: autoEraseEnabled,
                    maxTrazos
                }
            }
        }, (result) => {
            featureSaving = false;
            if (result?.ok) {
                featureDirty = false;
                actionMessage = result.pruned
                    ? `Funciones guardadas. Se borraron ${formatNumber(result.pruned)} eventos antiguos.`
                    : 'Funciones guardadas.';
                return;
            }
            actionMessage = 'No se pudieron guardar las funciones del tablero';
        });
    }
</script>

<svelte:head>
    <title>Administración | Trazos</title>
</svelte:head>

{#if loading}
    <main class="admin-shell" data-live-mode-params={liveModeParamsJson}>
        <p class="muted">Cargando...</p>
    </main>
{:else if !admin}
    <main class="login-shell" data-live-mode-params={liveModeParamsJson}>
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
    <main class="admin-shell" data-live-mode-params={liveModeParamsJson}>
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
            <div class="panel board-panel">
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
                    <button
                        type="button"
                        class="ghost icon-close"
                        aria-label="Cerrar detalle"
                        on:click={() => selectedBoardId = ''}
                    >
                        ×
                    </button>

                    <section class="detail-section">
                        <h3 class="subsection-title">Información</h3>
                        <div class="detail-summary">
                            <div class="detail-heading">
                                <div class="detail-main">
                                    <p class="detail-label">Tablero</p>
                                    <h2>{selectedBoard.id}</h2>
                                </div>
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
                        </div>
                    </section>

                    <section class="detail-section">
                        <h3 class="subsection-title">Configuración</h3>
                        <div class="feature-panel">
                            <div class="sub-panel">
                                <p class="detail-label">Funciones</p>
                                <h4>Borrar trazos antiguos automáticamente</h4>
                                <label class="switch-row">
                                    <span class="switch-control">
                                        <input
                                            type="checkbox"
                                            role="switch"
                                            aria-label="Borrar trazos antiguos automáticamente"
                                            checked={autoEraseEnabled}
                                            on:change={(event) => updateAutoEraseEnabled(event.currentTarget.checked)}
                                        />
                                        <span class="switch-track" aria-hidden="true"></span>
                                    </span>
                                    <span>{autoEraseEnabled ? 'Activado' : 'Desactivado'}</span>
                                </label>
                                <label class:disabled={!autoEraseEnabled} class="feature-field">
                                    Máximo de trazos
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        step="1"
                                        value={autoEraseMaxTrazos}
                                        disabled={!autoEraseEnabled}
                                        on:input={(event) => updateAutoEraseMax(event.currentTarget.valueAsNumber)}
                                    />
                                </label>
                                <div class="panel-actions">
                                    <button
                                        type="button"
                                        disabled={!featureDirty || featureSaving}
                                        on:click={() => saveBoardFeatures(selectedBoard)}
                                    >
                                        {featureSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                            <div class="sub-panel actions">
                                <p class="detail-label">Acciones</p>
                                <h4>Borrar todos los trazos del tablero ahora</h4>
                                <button class="danger" on:click={() => eraseBoard(selectedBoard)}>Limpiar tablero</button>
                            </div>
                        </div>
                    </section>

                    <section class="detail-section">
                        <h3 class="subsection-title">Active users</h3>
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
                    </section>
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

    .login-shell,
    .admin-shell {
        --space-2xs: calc(var(--p-density, 1) * 4px);
        --space-xs: calc(var(--p-density, 1) * 8px);
        --space-sm: calc(var(--p-density, 1) * 12px);
        --space-md: calc(var(--p-density, 1) * 16px);
        --space-lg: calc(var(--p-density, 1) * 24px);
        --space-xl: calc(var(--p-density, 1) * 32px);
        --space-2xl: calc(var(--p-density, 1) * 48px);
        --shell-gutter: clamp(var(--space-md), 4vw, var(--space-xl));
        --panel-padding: clamp(var(--space-sm), 2vw, var(--space-lg));
        --table-row-height: max(34px, calc(var(--p-density, 1) * 38px));
        --touch-target: 44px;
        --col-2xs: max(62px, calc(var(--p-density, 1) * 62px));
        --col-xs: max(70px, calc(var(--p-density, 1) * 70px));
        --col-sm: max(76px, calc(var(--p-density, 1) * 76px));
        --col-md: max(82px, calc(var(--p-density, 1) * 82px));
        --col-lg: max(86px, calc(var(--p-density, 1) * 86px));
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
        padding: 0 var(--space-sm);
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    button:disabled {
        cursor: not-allowed;
        filter: grayscale(.6) brightness(.7);
        opacity: .7;
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

    .switch-control input:focus-visible + .switch-track {
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
        padding: var(--shell-gutter);
    }

    .login-panel {
        width: min(360px, 100%);
        border-radius: 8px;
        background: var(--md-surface-container);
        padding: var(--space-lg);
        display: grid;
        gap: var(--space-md);
    }

    .login-panel h1,
    .admin-header h1,
    .panel h2 {
        margin: 0;
        line-height: 1;
    }

    .login-panel label {
        display: grid;
        gap: var(--space-xs);
        color: var(--md-on-surface-variant);
        font-size: 13px;
    }

    .login-panel input {
        border: 1px solid var(--md-outline);
        border-radius: 6px;
        background: var(--md-surface);
        color: var(--md-on-surface);
        min-height: 36px;
        padding: 0 var(--space-sm);
    }

    .admin-shell {
        width: min(1180px, calc(100% - (var(--shell-gutter) * 2)));
        margin: 0 auto;
        padding: var(--space-lg) 0 var(--space-2xl);
    }

    .admin-header,
    .session {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-sm);
    }

    .admin-header {
        padding-bottom: var(--space-xs);
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
        margin-bottom: var(--space-2xs);
    }

    .error {
        color: var(--md-on-error-container);
        margin: 0;
        font-size: 13px;
    }

    .notice {
        margin-top: var(--space-xs);
        padding: var(--space-xs) 0;
        color: var(--md-primary);
    }

    .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(max(calc(var(--p-density, 1) * 128px), 120px), 1fr));
        gap: var(--space-xs);
        margin: var(--space-sm) 0 var(--space-xl);
    }

    .metrics div,
    .panel {
        background: var(--md-surface-container);
    }

    .metrics div {
        border-radius: 8px;
        padding: var(--space-sm);
        display: grid;
        gap: var(--space-2xs);
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
        gap: var(--space-sm);
        align-items: start;
    }

    .section-title {
        margin: 0;
        font-size: 18px;
        line-height: 1.2;
    }

    .detail-title {
        margin-top: var(--space-xl);
    }

    .panel {
        min-width: 0;
        border-radius: 8px;
        padding: var(--panel-padding);
    }

    .board-panel {
        padding-block: var(--space-sm);
    }

    .detail {
        container-type: inline-size;
        padding: var(--space-lg);
        position: relative;
    }

    .icon-close {
        position: absolute;
        top: var(--space-sm);
        right: var(--space-sm);
        width: 34px;
        min-height: 34px;
        padding: 0;
        display: inline-grid;
        place-items: center;
        font-size: 24px;
        line-height: 1;
    }

    .detail-section {
        display: grid;
        gap: var(--space-sm);
        padding-top: var(--space-lg);
    }

    .detail-section:first-of-type {
        padding-top: 0;
        padding-right: calc(34px + var(--space-md));
    }

    .detail-section + .detail-section {
        border-top: 1px solid var(--md-outline-variant);
        margin-top: var(--space-lg);
    }

    .subsection-title {
        margin: 0;
        color: var(--md-primary);
        font-size: 15px;
        line-height: 1.2;
    }

    .detail-summary {
        display: grid;
        grid-template-columns: minmax(260px, .8fr) minmax(calc(var(--p-density, 1) * 260px), 1fr) minmax(calc(var(--p-density, 1) * 240px), 1fr);
        gap: var(--space-lg);
        align-items: start;
    }

    .detail-heading {
        display: grid;
        gap: var(--space-md);
        min-width: 0;
    }

    .detail-main h2 {
        margin: var(--space-2xs) 0 0;
        line-height: 1.1;
        overflow-wrap: anywhere;
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
        gap: var(--space-sm);
    }

    .detail-meta div {
        border-left: 1px solid var(--md-outline-variant);
        padding-left: var(--space-sm);
        display: grid;
        gap: var(--space-xs);
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

    .feature-panel {
        display: grid;
        gap: var(--space-sm);
        align-items: start;
    }

    .sub-panel {
        border-radius: 8px;
        background: var(--md-surface-container-high);
        display: grid;
        gap: var(--space-sm);
        align-content: start;
        padding: var(--space-md);
    }

    .sub-panel.actions {
        justify-items: start;
    }

    .feature-panel h4 {
        margin: var(--space-2xs) 0 0;
        font-size: 16px;
        line-height: 1.2;
    }

    .switch-row,
    .feature-field {
        color: var(--md-on-surface-variant);
        font-size: 12px;
    }

    .switch-row {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        min-height: var(--touch-target);
    }

    .switch-control {
        position: relative;
        display: inline-flex;
        width: 44px;
        height: 26px;
        flex: 0 0 auto;
    }

    .switch-control input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        cursor: pointer;
        opacity: 0;
    }

    .switch-track {
        width: 100%;
        height: 100%;
        border: 1px solid var(--md-outline);
        border-radius: 999px;
        background: var(--md-surface);
        pointer-events: none;
        transition: background-color 120ms ease, border-color 120ms ease;
    }

    .switch-track::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: var(--md-on-surface-variant);
        transition: transform 120ms ease, background-color 120ms ease;
    }

    .switch-control input:checked + .switch-track {
        border-color: var(--md-primary);
        background: color-mix(in srgb, var(--md-primary) 24%, transparent);
    }

    .switch-control input:checked + .switch-track::after {
        transform: translateX(18px);
        background: var(--md-primary);
    }

    .feature-field {
        display: grid;
        gap: var(--space-xs);
    }

    .feature-field.disabled {
        opacity: .52;
    }

    .feature-field input {
        border: 1px solid var(--md-outline);
        border-radius: 6px;
        background: var(--md-surface);
        color: var(--md-on-surface);
        min-height: 34px;
        padding: 0 var(--space-sm);
        width: max(calc(var(--p-density, 1) * 130px), 112px);
    }

    .feature-field input:disabled {
        color: var(--md-on-surface-variant);
    }

    .panel-actions {
        display: flex;
        gap: var(--space-xs);
        flex-wrap: wrap;
        justify-content: flex-start;
    }

    .table {
        overflow: auto;
    }

    .row {
        display: grid;
        align-items: center;
        gap: var(--space-sm);
        min-width: 0;
        min-height: var(--table-row-height);
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
        grid-template-columns: minmax(calc(var(--p-density, 1) * 128px), 1fr) var(--col-sm) var(--col-lg) var(--col-md) var(--col-md) minmax(calc(var(--p-density, 1) * 132px), 1fr) minmax(calc(var(--p-density, 1) * 132px), 1fr);
    }

    .board-row {
        background: transparent;
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
        border-color: var(--md-outline-variant);
        border-radius: 0;
        color: var(--md-on-surface);
        min-height: max(var(--touch-target), var(--table-row-height));
        padding: 0 var(--space-xs);
    }

    .board-row.selected,
    .board-row:hover {
        background: var(--md-surface-container-high);
        color: var(--md-primary);
    }

    .users .row {
        grid-template-columns: minmax(calc(var(--p-density, 1) * 128px), 1fr) minmax(calc(var(--p-density, 1) * 104px), .75fr) var(--col-2xs) var(--col-xs) var(--col-md) minmax(calc(var(--p-density, 1) * 132px), 1fr) minmax(calc(var(--p-density, 1) * 190px), 1fr) var(--col-sm);
    }

    .layers {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-xs);
        margin-top: var(--space-xs);
    }

    .layers.compact {
        margin-top: 0;
        gap: var(--space-2xs);
    }

    .row span.layers {
        overflow: visible;
        white-space: normal;
    }

    .layer-chip {
        display: inline-flex;
        align-items: center;
        gap: var(--space-xs);
        border-radius: 999px;
        background: var(--md-surface-container-high);
        color: var(--md-on-surface);
        padding: var(--space-2xs) var(--space-xs);
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

    @container (max-width: 760px) {
        .detail-summary,
        .feature-panel {
            grid-template-columns: 1fr;
        }

        .detail-meta {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 940px) {
        .admin-header,
        .session {
            align-items: flex-start;
        }

        .admin-header {
            flex-direction: column;
        }

        .detail {
            padding: var(--space-md);
        }
    }

    @media (max-width: 620px) {
        .detail {
            padding: var(--space-sm);
        }

        .feature-panel button,
        .login-panel button {
            width: 100%;
        }
    }
</style>
