// Calm-play rules: press-and-hold Home lock, 15-minute rest lock ("Jom rehat") with a typed-YES parent gate, device-only storage.
import { g, D, C, R, MIN, hit, Rect, Scene, Pt, go, sfx, say, txt, TICK, input, cur, LOCK } from "./core";
import { pic, fitPic, cover, coverY } from "./art";
import { S } from "./audio";
import { vs } from "./vsfx";

/** seconds a child must hold the Home lock */
export const HOME_HOLD_S = 2;
/** minutes of continuous play before the rest screen appears (one constant: change it here) */
export const REST_MINUTES = 15;
/** wrong YES tries before the box goes quiet, and for how long */
export const WRONG_TRIES = 3, COOLDOWN_S = 30;
const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
export const RM = reduced;

// ---- device-only storage (private mode safe) ----
const mem: Record<string, string> = {};
export const store = {
  get(k: string): string | null { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} return k in mem ? mem[k] : null; },
  set(k: string, v: string) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} },
  del(k: string) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} },
};

// ---- Home: press and hold ----
export class HoldHome {
  r: Rect = { x: 0, y: 0, w: 0, h: 0 }; p = 0; on = false; held = 0; wob = 0; show = 0; pending = false;
  constructor(public onGo: () => void) {}
  /** tile rect in the top-left corner; the ring is drawn around it */
  layout(s: number) { this.r = { x: D.U * 3 + s * 0.3, y: D.U * 3 + s * 0.3, w: s, h: s }; return this.r; }
  press(p: Pt): boolean { if (!hit(p, this.r, 4)) return false; this.on = true; this.held = 0; this.show = 1; return true; }
  move(p: Pt) { if (this.on && !hit(p, this.r, this.r.w * 0.5)) { this.on = false; this.held = 0; } }
  release() { if (this.on) { this.on = false; if (this.held < HOME_HOLD_S) { this.wob = 0.7; this.show = 1.2; sfx.tap(); } this.held = 0; } }
  update(dt: number) {
    this.wob = Math.max(0, this.wob - dt); if (!this.on) this.show = Math.max(0, this.show - dt);
    if (this.on) { this.held += dt; this.p = Math.min(1, this.held / HOME_HOLD_S); if (this.p >= 1 && !this.pending) { this.on = false; this.pending = true; this.onGo(); } }
    else this.p = Math.max(0, this.p - dt * 2.5);
  }
  draw() {
    const r = this.r, cx = r.x + r.w / 2, cy = r.y + r.h / 2, rr = r.w / 0.62;
    const a = this.on || this.p > 0 ? 1 : Math.min(1, this.show);
    if (a > 0) {
      g.save(); g.globalAlpha = a; g.translate(cx, cy); if (this.wob > 0 && !reduced()) g.rotate(Math.sin(D.t * 26) * this.wob * 0.12); g.translate(-cx, -cy);
      const x = cx - rr / 2, y = cy - rr / 2;
      fitPic("hold-ring", x, y, rr, rr);
      if (this.p > 0) { const im = pic("hold-ring-fill"); if (im) { g.save(); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + this.p * Math.PI * 2); g.closePath(); g.clip(); fitPic("hold-ring-fill", x, y, rr, rr); g.restore(); } }
      g.restore();
    }
    g.save(); g.globalAlpha = 0.9; if (this.wob > 0 && !reduced()) { g.translate(cx, cy); g.rotate(Math.sin(D.t * 26) * this.wob * 0.12); g.translate(-cx, -cy); }
    if (!fitPic("home-button-locked", r.x, r.y, r.w, r.h)) { R(r.x, r.y, r.w, r.h, C.cream); }
    g.restore();
  }
}

// ---- play-time tracking: device only ----
let sec = 0; const KP = "lrPlay", KR = "lrRest", KT = "lrRestTry";
try { const p = JSON.parse(store.get(KP) || "null"); if (p && Date.now() - p.t < 10 * 60e3) sec = p.s || 0; } catch (e) {}
let saveT = 0;
export const restPending = () => store.get(KR) === "1";
export const calm = { setSec(n: number) { sec = n; }, get sec() { return sec; } };
let showRest: (fresh: boolean) => void = () => {};
export function installCalm(f: (fresh: boolean) => void) {
  showRest = f;
  TICK.fn = (dt) => {
    if (LOCK.on) return;
    if (document.hidden) return;
    if (performance.now() - input.last > 180e3) { sec = 0; } else sec += dt;
    saveT += dt; if (saveT > 5) { saveT = 0; store.set(KP, JSON.stringify({ s: Math.round(sec), t: Date.now() })); }
    if (sec >= REST_MINUTES * 60 && !input.down() && !(cur() as any)?.calmExempt) startRest(true);
  };
  if (restPending()) startRest(false);
}
export function startRest(fresh: boolean) { store.set(KR, "1"); LOCK.on = true; showRest(fresh); }
export function endRest() { store.del(KR); store.del(KT); sec = 0; store.set(KP, JSON.stringify({ s: 0, t: Date.now() })); LOCK.on = false; }

// ---- rest lock scene ----
const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();
export class Rest implements Scene {
  isRest = true; t = 0; shake = 0; box: HTMLDivElement; inp: HTMLInputElement; btn: HTMLButtonElement; lab: HTMLDivElement; lab2: HTMLDivElement; card = { x: 0, y: 0, w: 0, h: 0 }; kb = false; fresh: boolean; homeFn: () => void;
  constructor(fresh: boolean, homeFn: () => void) {
    this.fresh = fresh; this.homeFn = homeFn;
    const b = (this.box = document.createElement("div")); b.id = "restbox";
    b.innerHTML = '<div class="l1"></div><div class="l2"></div><div class="row"><input type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done" maxlength="12" aria-label="YES"><button type="button">OK</button></div>';
    this.lab = b.querySelector(".l1") as HTMLDivElement; this.lab2 = b.querySelector(".l2") as HTMLDivElement; this.inp = b.querySelector("input") as HTMLInputElement; this.btn = b.querySelector("button") as HTMLButtonElement;
    const fire = () => this.submit();
    this.btn.addEventListener("click", fire); this.inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fire(); } });
    this.inp.addEventListener("focus", () => { this.kb = true; window.scrollTo(0, 0); this.pos(); }); this.inp.addEventListener("blur", () => { this.kb = false; setTimeout(() => this.pos(), 60); });
    const vv = (window as any).visualViewport; if (vv) { vv.addEventListener("resize", () => this.pos()); vv.addEventListener("scroll", () => this.pos()); }
    document.body.appendChild(b);
  }
  enter() { LOCK.on = true; store.set(KR, "1"); if (this.fresh) { say("x_rest"); } this.t = 0; this.refresh(); }
  leave() { try { this.box.remove(); } catch (e) {} }
  tries(): { n: number; until: number } { try { const o = JSON.parse(store.get(KT) || "null"); if (o) return o; } catch (e) {} return { n: 0, until: 0 }; }
  refresh() {
    const bm = S.lang === "bm"; this.lab.textContent = bm ? "Ibu bapa: taip YES untuk sambung" : "Parents: type YES to continue"; this.lab2.textContent = bm ? "Parents: type YES to continue" : "Ibu bapa: taip YES untuk sambung";
    const quiet = this.tries().until > Date.now(); this.inp.disabled = quiet; this.btn.disabled = quiet; this.box.classList.toggle("quiet", quiet);
    this.inp.placeholder = quiet ? (bm ? "Tunggu sekejap…" : "One moment…") : "YES";
  }
  submit() {
    const tr = this.tries(); if (tr.until > Date.now()) return;
    if (norm(this.inp.value) === "YES") { this.unlock(); return; }
    this.inp.value = ""; this.shake = 0.6; this.box.classList.remove("shake"); void this.box.offsetWidth; if (!reduced()) this.box.classList.add("shake");
    tr.n++; if (tr.n >= WRONG_TRIES) { tr.n = 0; tr.until = Date.now() + COOLDOWN_S * 1000; this.inp.blur(); }
    store.set(KT, JSON.stringify(tr)); this.refresh();
  }
  unlock() { endRest(); this.inp.blur(); this.homeFn(); }
  layout() {
    const land = D.W > D.H, W = D.W, H = D.H;
    this.card = land ? { x: W * 0.28, y: H * 0.3, w: W * 0.44, h: H * 0.5 } : { x: W * 0.08, y: H * 0.5, w: W * 0.84, h: H * 0.3 };
    this.pos();
  }
  pos() {
    const c = this.card, b = this.box.style, vv = (window as any).visualViewport, s = Math.min(D.W, D.H);
    const fs = Math.max(14, Math.min(22, s * 0.04)); b.fontSize = fs + "px";
    if (this.kb && vv) { const w = Math.min(D.W * 0.92, 460); b.left = vv.offsetLeft + (vv.width - w) / 2 + "px"; b.top = vv.offsetTop + 6 + "px"; b.width = w + "px"; this.box.classList.add("kb"); }
    else { this.box.classList.remove("kb"); const padX = c.w * 0.08; b.left = c.x + padX + "px"; b.width = c.w - padX * 2 + "px"; b.top = c.y + c.h * 0.46 + "px"; }
  }
  update(dt: number) { this.t += dt; this.shake = Math.max(0, this.shake - dt); if (this.box.classList.contains("quiet") && this.tries().until <= Date.now()) { this.refresh(); } }
  draw() {
    const land = D.W > D.H, bk = land ? "bg-rest" : "bg-rest-portrait"; pic(bk); if (!cover(bk)) R(0, 0, D.W, D.H, "#E9D8C8");
    const c = this.card, s = Math.min(D.W, D.H), sh = this.shake > 0 && !reduced() ? Math.sin(D.t * 40) * this.shake * s * 0.02 : 0;
    g.save(); g.translate(sh, 0); g.fillStyle = "rgba(250,246,238,.93)"; g.shadowColor = "rgba(80,60,40,.25)"; g.shadowBlur = s * 0.04; g.beginPath(); const rr = s * 0.04; g.roundRect ? g.roundRect(c.x, c.y, c.w, c.h, rr) : g.rect(c.x, c.y, c.w, c.h); g.fill(); g.restore();
    const bm = S.lang === "bm"; const fs = Math.max(20, Math.min(c.h * 0.2, c.w * 0.1, 56));
    txt(bm ? "Jom rehat" : "Time for a break", c.x + c.w / 2 + sh, c.y + c.h * 0.2, fs, "#4A4A48", "center", false);
    txt(bm ? "Time for a break" : "Jom rehat", c.x + c.w / 2 + sh, c.y + c.h * 0.34, fs * 0.5, "#8C8A84", "center", false);
    // the sleepy car, parked on the sand, breathing very slowly
    const im = pic("rest-car-sleeping") || pic("rest-car-sleeping-plain");
    if (im) { const a = im.naturalWidth / im.naturalHeight; let w: number, cx: number, gy: number;
      if (land) { w = Math.min(D.W * 0.2, D.H * 0.5 * a); cx = D.W * 0.5 + (c.x + c.w - D.W * 0.5) * 0.0 + D.W * 0.0; cx = D.W * 0.5; gy = D.H * 0.97; w = Math.min(w, D.H * 0.17 * a); }
      else { w = Math.min(D.W * 0.45, (c.y - D.H * 0.3) * a); cx = D.W * 0.5; gy = c.y - D.H * 0.01; }
      const br = reduced() ? 1 : 1 + 0.015 * Math.sin(this.t * 1.5), h = w / a * br, ww = w * br; g.drawImage(im, cx - ww / 2, gy - h, ww, h); }
  }
}
export function injectRestCss() {
  const st = document.createElement("style");
  st.textContent = `#restbox{position:fixed;z-index:20;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:.35em;font-family:Fredoka,system-ui,sans-serif;color:#4A4A48;text-align:center;-webkit-user-select:text;user-select:text;touch-action:manipulation}
#restbox .l1{font-weight:600;font-size:1em}#restbox .l2{font-size:.72em;opacity:.65;margin-top:-.25em}
#restbox .row{display:flex;gap:.5em;width:100%;justify-content:center}
#restbox input{font:inherit;font-size:max(16px,1.2em);width:60%;min-width:0;padding:.45em .6em;border:2px solid #C9BFA8;border-radius:.7em;background:#fff;color:#4A4A48;text-align:center;letter-spacing:.15em;text-transform:uppercase;outline:none;-webkit-user-select:text;user-select:text;-webkit-touch-callout:default;touch-action:manipulation}
#restbox input:focus{border-color:#4FA38C}
#restbox button{font:inherit;font-size:max(16px,1.1em);padding:.45em 1em;border:0;border-radius:.7em;background:#4FA38C;color:#fff;min-height:44px;touch-action:manipulation}
#restbox.quiet input,#restbox.quiet button{opacity:.5}
#restbox.kb{background:rgba(250,246,238,.97);border-radius:1em;padding:.7em .8em;box-shadow:0 4px 18px rgba(80,60,40,.3)}
#restbox.shake{animation:lrshake .5s ease}
@keyframes lrshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}`;
  document.head.appendChild(st);
}
