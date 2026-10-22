import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, userAgent: "Mobile" });
const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:8765/LittleRacers/", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: "/workspace/lr-hub-phone-landscape.png" });
const bed = await p.evaluate(() => { const r = window.__lr.cur().bed; return [r.x + r.w / 2, r.y + r.h / 2]; });
await p.touchscreen.tap(...bed);
const t0 = Date.now(); let last = -1;
while (Date.now() - t0 < 300000) {
  const st = await p.evaluate(() => { const s = window.__lr.cur(); return { sc: s.sc, off: s.off }; });
  if (st.sc !== last) { last = st.sc; console.log("scene", st.sc, ((Date.now() - t0) / 1000).toFixed(0) + "s"); }
  if (st.off) break;
  await new Promise(r => setTimeout(r, 4000)); await p.touchscreen.tap(400, 250);
  if ([1, 3, 6].includes(st.sc)) await p.screenshot({ path: `/workspace/lr-bedtime-${st.sc}.png` });
}
console.log("ended", ((Date.now() - t0) / 1000).toFixed(0), "s errors", errs);
await b.close();
