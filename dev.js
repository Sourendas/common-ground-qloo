// Local dev server: static files + /api/plan (reads .env-style vars from process env).
import http from "node:http"; import fs from "node:fs";
import handler from "./api/plan.js";
http.createServer(async (req, res) => {
  if (req.url === "/api/plan") {
    let d = ""; for await (const c of req) d += c; req.body = d;
    res.status = (c) => (res.statusCode = c, res); res.json = (o) => (res.setHeader("content-type", "application/json"), res.end(JSON.stringify(o)));
    return handler(req, res);
  }
  const f = req.url === "/" ? "index.html" : req.url.slice(1);
  try { res.end(fs.readFileSync("public/" + f.replace(/\.\./g, ""))); } catch { res.statusCode = 404; res.end("nf"); }
}).listen(process.env.PORT || 3000);
