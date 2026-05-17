const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ROOT_DIR = __dirname;

function loadDotEnv() {
	const envPath = path.join(ROOT_DIR, '.env');

	if (!fs.existsSync(envPath)) {
		return;
	}

	const contents = fs.readFileSync(envPath, 'utf8');
	for (const line of contents.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const equalsIndex = trimmed.indexOf('=');
		if (equalsIndex === -1) continue;

		const key = trimmed.slice(0, equalsIndex).trim();
		const value = trimmed.slice(equalsIndex + 1).trim();

		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

loadDotEnv();

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp'
};

function sendJson(res, statusCode, payload) {
	res.writeHead(statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Allow-Methods': 'POST, OPTIONS'
	});
	res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
	res.writeHead(statusCode, { 'Content-Type': contentType });
	res.end(text);
}

function serveStaticFile(res, requestPath) {
	const safePath = requestPath === '/' ? '/index.html' : requestPath;
	const filePath = path.normalize(path.join(ROOT_DIR, safePath));

	if (!filePath.startsWith(ROOT_DIR)) {
		sendText(res, 403, 'Forbidden');
		return;
	}

	fs.readFile(filePath, (error, data) => {
		if (error) {
			sendText(res, 404, 'Not found');
			return;
		}

		const ext = path.extname(filePath).toLowerCase();
		const contentType = MIME_TYPES[ext] || 'application/octet-stream';
		res.writeHead(200, { 'Content-Type': contentType });
		res.end(data);
	});
}

async function handleGeminiProxy(req, res) {
	const GROQ_API_KEY = process.env.GROQ_API_KEY;

	if (!GROQ_API_KEY) {
		sendJson(res, 500, { error: 'Missing GROQ_API_KEY on the server.' });
		return;
	}

	let body = '';

	req.on('data', (chunk) => {
		body += chunk;
	});

	req.on('end', async () => {
		try {
			const payload = JSON.parse(body || '{}');
			const upstreamResponse = await fetch(GROQ_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${GROQ_API_KEY}`
				},
				body: JSON.stringify(payload)
			});

			const responseText = await upstreamResponse.text();

			if (!upstreamResponse.ok) {
				console.error('Groq API Error:', upstreamResponse.status, responseText);
			}

			res.writeHead(upstreamResponse.status, {
				'Content-Type': 'application/json; charset=utf-8',
				'Access-Control-Allow-Origin': '*'
			});
			res.end(responseText);
		} catch (error) {
			sendJson(res, 500, { error: 'Failed to proxy request.' });
			console.error(error);
		}
	});
}

const server = http.createServer((req, res) => {
	if (req.url === '/api/gemini' && req.method === 'OPTIONS') {
		res.writeHead(204, {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Access-Control-Allow-Methods': 'POST, OPTIONS'
		});
		res.end();
		return;
	}

	if (req.method === 'POST' && req.url === '/api/gemini') {
		handleGeminiProxy(req, res);
		return;
	}

	if (req.method === 'GET') {
		const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
		serveStaticFile(res, pathname);
		return;
	}

	sendText(res, 405, 'Method not allowed');
});

server.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
