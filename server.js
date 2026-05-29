const http = require("http");
const fs = require("fs");
const path = require("path");
const storage = require("./storage");

const PORT = Number(process.env.PORT || 8002);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT_DIR = __dirname;
const MAX_BODY_BYTES = 25 * 1024 * 1024;

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    res.end(body);
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => {
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                reject(new Error("Payload terlalu besar"));
                req.destroy();
            }
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(new Error("Format JSON tidak valid"));
            }
        });
        req.on("error", reject);
    });
}

async function handleApi(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/state") {
        const current = await storage.getState({ initialize: false });
        return sendJson(res, 200, {
            initialized: Boolean(current),
            settings: current ? current.settings : null,
            questions: current ? current.questions : null,
            sessions: current ? current.sessions : null,
            updatedAt: current ? current.updatedAt : null
        });
    }

    if (req.method === "GET" && pathname === "/api/sessions") {
        const current = await storage.getState({ initialize: true });
        return sendJson(res, 200, { sessions: current.sessions || [] });
    }

    if (req.method !== "POST") {
        return sendJson(res, 405, { error: "Method tidak didukung" });
    }

    let payload;
    try {
        payload = await readJsonBody(req);
    } catch (err) {
        return sendJson(res, 400, { error: err.message });
    }

    if (pathname === "/api/bootstrap") {
        const current = await storage.bootstrapState({
            settings: payload.settings || storage.DEFAULT_SETTINGS,
            questions: Array.isArray(payload.questions) ? payload.questions : storage.DEFAULT_QUESTIONS
        });
        return sendJson(res, 200, { ok: true, state: current });
    }

    if (pathname === "/api/settings") {
        const current = await storage.updateSettings(payload.settings || {});
        return sendJson(res, 200, { ok: true, state: current });
    }

    if (pathname === "/api/questions") {
        const current = await storage.updateQuestions(payload.questions || []);
        return sendJson(res, 200, { ok: true, state: current });
    }

    if (pathname === "/api/sessions/upsert") {
        const session = payload.session;
        if (!session || !session.nis) {
            return sendJson(res, 400, { error: "Data sesi siswa tidak valid" });
        }

        const result = await storage.upsertSession(session);
        return sendJson(res, 200, { ok: true, session: result.session, sessions: result.sessions });
    }

    if (pathname === "/api/sessions/clear") {
        const sessions = await storage.clearSessions();
        return sendJson(res, 200, { ok: true, sessions });
    }

    return sendJson(res, 404, { error: "Endpoint tidak ditemukan" });
}

function serveStatic(req, res, pathname) {
    const cleanPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = path.normalize(path.join(ROOT_DIR, cleanPath));

    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        res.writeHead(200, {
            "Content-Type": getContentType(filePath),
            "Cache-Control": "no-store"
        });
        res.end(data);
    });
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml"
    };
    return types[ext] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
        handleApi(req, res, url.pathname).catch(err => {
            console.error(err);
            sendJson(res, 500, { error: "Server error" });
        });
        return;
    }

    serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(PORT, HOST, () => {
    console.log(`ExaGuard server aktif di http://${HOST}:${PORT}`);
    console.log(`Penyimpanan: ${storage.isDatabaseEnabled() ? "Postgres/Supabase" : "file JSON lokal"}`);
    console.log(`Buka admin: http://localhost:${PORT}/admin.html`);
});
