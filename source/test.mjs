import puppeteer from "puppeteer-core";
const VPS = (process.env.VPS ? JSON.parse(process.env.VPS) : [["phone-portrait", 390, 844], ["phone-landscape", 844, 390], ["tablet-landscape", 1180, 820], ["tablet-portrait", 820, 1180]]);
const only = process.argv[2];
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const results = [];
for (const [name, w, h] of VPS) {
  const p = await b.newPage(); await p.emulate({ viewport: { width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, userAgent: "Mozilla/5.0 (Linux; Android 13) Mobile" });
  const errs = [], ext = [];
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", (e) => errs.push(String(e)));
  p.on("request", (r) => { if (!r.url().startsWith("http://localhost:8765")) ext.push(r.url()); });
  await p.goto("http://localhost:8765/LittleRacers/", { waitUntil: "networkidle0" });
  const cdp = await p.target().createCDPSession();
  const T = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  const tap = async (x, y) => { await T("touchStart", x, y); await new Promise((r) => setTimeout(r, 60)); await T("touchEnd"); };
  const drag = async (pts) => { await T("touchStart", pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) { await T("touchMove", x, y); await new Promise((r) => setTimeout(r, 16)); } await T("touchEnd"); };
  const line = (a, c, n = 12) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (c[0] - a[0]) * i / n, a[1] + (c[1] - a[1]) * i / n]);
  await new Promise((r) => setTimeout(r, 800));
  if (name === "phone-portrait" || name === "tablet-landscape") await p.screenshot({ path: `/workspace/lr-hub-${name}.png` });
  const games = await p.evaluate(() => window.__lr.GAMES.map((g) => g.id));
  for (const id of games) {
    if (only && id !== only) continue;
    const t0 = Date.now();
    await p.evaluate((id) => { const d = window.__lr.GAMES.find((g) => g.id === id); window.__lr.go(d.make()); }, id);
    let done = false, steps = 0, shot = false;
    while (!done && Date.now() - t0 < 240000 && steps < 400) {
      steps++;
      const a = await p.evaluate(() => {
        const s = window.__lr.cur(); if (s.again) return { done: true };
        if (s.wait > 0) return { wait: 300 };
        const c = (r) => [r.x + r.w / 2, r.y + r.h / 2];
        const it = (i) => [i.x, i.y];
        switch (s.id) {
          case "beep": { const i = s.items.find((i) => !i.done); return i ? { tap: it(i) } : { wait: 400 }; }
          case "wash": { if (s.phase === 0) { const r = s.carRect(); const pts = []; for (let j = 0; j < 5; j++) for (let k = 0; k <= 10; k++) pts.push([r.x + r.w * (j % 2 ? 1 - k / 10 : k / 10), r.y + r.h * (0.1 + j * 0.2)]); return { path: pts }; } if (s.phase === 1) return { tap: c(s.soap) }; if (s.phase === 2) return { tap: c(s.hose) }; return { wait: 500 }; }
          case "peek": { const i = s.items.find((i) => !i.opening); return i ? { tap: it(i) } : { wait: 400 }; }
          case "colour": { const sp = s.spots.find((p) => p.c === s.car.c); return { drag: [it(s.car), it(sp)] }; }
          case "light": return { hold: c(s.pedal), ms: 1500 };
          case "build": { if (s.stage === 3) return s.drive ? { wait: 400 } : { tap: c(s.goBtn) }; return { drag: [it(s.piece), [s.cx, s.gy - 6 * s.u]] }; }
          case "count": { if (s.counting) return { wait: 400 }; const o = s.opts.find((o) => o.v === s.n); return { tap: it(o) }; }
          case "maze": { const a = s.at(s.prog); const pts = []; for (let k = 0; k <= 60; k++) { const q = s.at(Math.min(s.len, s.prog + (s.len * k) / 60)); pts.push([q.x, q.y]); } return { path: pts }; }
          case "shape": { const t = s.tun.find((t) => t.s === s.car.s); return { drag: [it(s.car), it(t)] }; }
          case "letter": { const want = s.w[s.got]; const wv = s.wave.find((w) => !w.hit && w.l === want && w.x > -0.05); return wv ? { tap: [window.__lr.D.W * 0.6, s.lanesY[wv.lane]], then: 600 } : { wait: 400 }; }
          case "race": { const v = s.vs.find((v) => v.rank === s.filled && v.slot < 0); return v && !s.racing ? { drag: [it(v), it(s.slots[s.filled])] } : { wait: 400 }; }
          case "help": { if (s.sent) return { wait: 400 }; const o = s.opts.find((o) => o.k === s.need); return { tap: it(o) }; }
          case "kampung": { if (s.showing) return { wait: 500 }; const pl = s.places.find((q) => q.k === s.route[s.step]); return { tap: it(pl) }; }
        }
        return { wait: 300 };
      });
      if (a.done) { done = true; break; }
      if (a.wait) await new Promise((r) => setTimeout(r, a.wait));
      if (a.tap) { await tap(...a.tap); await new Promise((r) => setTimeout(r, a.then || 250)); }
      if (a.drag) { await drag(line(a.drag[0], a.drag[1])); await new Promise((r) => setTimeout(r, 300)); }
      if (a.path) { await drag(a.path); await new Promise((r) => setTimeout(r, 300)); }
      if (a.hold) { await T("touchStart", ...a.hold); await new Promise((r) => setTimeout(r, a.ms)); await T("touchEnd"); }
      if (!shot && steps === 3 && name === "phone-landscape" && ["wash", "count", "kampung", "letter"].includes(id)) { shot = true; await p.screenshot({ path: `/workspace/lr-${id}.png` }); }
    }
    results.push(`${name} ${id}: ${done ? "DONE" : "STUCK"} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    console.log(results[results.length - 1]);
    if (done && name === "phone-portrait" && id === "beep") await p.screenshot({ path: "/workspace/lr-done.png" });
  }
  console.log(name, "errors:", errs.slice(0, 5), "external:", ext.slice(0, 5));
  await p.close();
}
await b.close();
