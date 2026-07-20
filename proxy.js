/**
 * CalSnap Dev Proxy — port 5000
 * Forwards /api/* → FastAPI on port 8001
 * Everything else → Expo Metro on port 8082
 */
const http = require("http");
const httpProxy = require("http-proxy");

const API_PORT = 8001;
const EXPO_PORT = 8082;
const PROXY_PORT = 5000;

const proxy = httpProxy.createProxyServer({ ws: true });

proxy.on("error", (err, req, res) => {
  console.error("[proxy error]", err.message);
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway: " + err.message);
  }
});

const server = http.createServer((req, res) => {
  const target =
    req.url.startsWith("/api/") || req.url.startsWith("/admin")
      ? `http://127.0.0.1:${API_PORT}`
      : `http://127.0.0.1:${EXPO_PORT}`;
  proxy.web(req, res, { target });
});

// WebSocket support for Metro hot reload
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: `http://127.0.0.1:${EXPO_PORT}` });
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`CalSnap proxy → :${PROXY_PORT}`);
  console.log(`  /api/*  → http://127.0.0.1:${API_PORT}`);
  console.log(`  *       → http://127.0.0.1:${EXPO_PORT}`);
});
