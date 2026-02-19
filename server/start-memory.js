const mode = process.argv[2];

if (mode === 'on') {
	process.env.TRAZOS_MEMORY_ENABLED = 'true';
} else if (mode === 'off') {
	process.env.TRAZOS_MEMORY_ENABLED = 'false';
} else {
	console.error('Usage: node ./server/start-memory.js <on|off>');
	process.exit(1);
}

await import('./index.js');
