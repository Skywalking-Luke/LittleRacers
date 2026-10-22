import { g, D, C, R, MIN, hit, Rect, Scene, Pt, go, star, pcirc, txt } from "./core";
import { ART, veh, cloud, place, palm, btnBox, homeIcon } from "./art";
import { goHome } from "./game";
import { say, stopVoice, bell, soft, S } from "./audio";
// Goodnight, Little Jeep / Selamat Malam, Jip Kecil (bedtime-story.md)
const N = { navy: "#2E3A59", lilac: "#8C86B0", lamp: "#F2D894", cream: "#FAF6EE", night2: "#232C46", field: "#3E4D63" };
const LULLABY = [392, 330, 349, 392, 440, 392, 349, 330, 294, 330, 349, 330, 294, 262, 294, 330, 392, 330, 349, 392, 440, 392, 349, 330, 294, 330, 349, 294, 262, 262, 262, 262];
export class Bedtime implements Scene {
  sc = 0; st = 0; fade = 0; spoke = false; narrDone = false; tok = 0; tapFx = 0; stars = 0; showReplay = false; homeB: Rect; parB: Rect; replay: Rect; mus: any = null; vol = 1; off = false; lights = 2; puffs: { x: number; y: number; t: number }[] = [];
  enter() { this.sc = 0; this.st = 0; this.off = false; this.vol = 1; this.showReplay = false; this.begin(); }
  layout() { const s = Math.max(MIN, Math.min(D.W, D.H) * 0.11); this.homeB = { x: D.U * 3, y: D.U * 3, w: s, h: s }; this.parB = { x: D.W - s - D.U * 3, y: D.U * 3, w: s, h: s }; const r = Math.max(MIN * 1.4, Math.min(D.W, D.H) * 0.22); this.replay = { x: D.W / 2 - r / 2, y: D.H / 2 - r / 2, w: r, h: r }; }
  leave() { ART.sleepy = false; this.tok++; if (this.mus) clearInterval(this.mus); this.mus = null; stopVoice(); }
  begin() {
    const t = ++this.tok; this.st = 0; this.spoke = false; this.narrDone = false; this.tapFx = 0; this.lights = 2; this.stars = 0; this.puffs = [];
    const keys = ["bt1", "bt2", "bt3", "bt4", "bt5", "bt6", null, "bt8"];
    setTimeout(async () => {
      if (t !== this.tok) return;
      if (this.sc === 6) { await this.lullaby(t); }
      else { await say(keys[this.sc], undefined, true, 0.75); }
      if (t !== this.tok) return; this.narrDone = true; this.st = 0;
    }, 2000);
  }
  async lullaby(t: number) {
    let i = 0; this.mus = setInterval(() => { if (S.mute) return; bell(LULLABY[i % LULLABY.length], 1.4, 0.05 * this.vol); i++; }, 750);
    for (let rep = 0; rep < 2; rep++) for (const k of ["lul1", "lul2", "lul3", "lul4"]) { if (t !== this.tok) return; await say(k, undefined, false, 0.6); await new Promise((r) => setTimeout(r, 1200)); }
    await new Promise((r) => setTimeout(r, 4000)); if (this.mus) clearInterval(this.mus); this.mus = null;
  }
  update(dt: number) {
    this.st += dt; this.tapFx = Math.max(0, this.tapFx - dt * 0.5);
    for (const p of this.puffs) { p.t += dt; p.y -= dt * 20; }
    const hold = this.sc === 7 ? 6 : this.sc === 6 ? 4 : 12; // seconds of calm after the narration
    if (this.narrDone && this.st > hold && !this.off) {
      if (this.sc < 7) { this.sc++; this.begin(); } else { this.off = true; this.showReplay = false; }
    }
    // fade in for first 2s of a scene, fade out in last 2s before advancing
    this.fade = Math.min(1, this.narrDone ? Math.max(0, (hold - this.st) / 2) : this.st / 2);
    if (this.sc === 7 && this.narrDone) this.vol = Math.max(0, 1 - this.st / hold);
  }
  draw() {
    const { W, H, U } = D, gy = H * 0.68;
    if (this.off) { R(0, 0, W, H, "#0b0e18"); if (this.showReplay) this.ui(); else this.dimHome(); return; }
    const sunset = this.sc === 0; ART.sleepy = this.sc >= 2;
    R(0, 0, W, gy, sunset ? "#D9A08A" : N.navy); R(0, gy * 0.55, W, gy * 0.45, sunset ? "#E8C08E" : N.night2);
    if (sunset) pcirc(W * 0.75, gy * 0.85, U * 10, "#F2C27A"); else { pcirc(W * 0.8, H * 0.15, U * 7, N.lamp); pcirc(W * 0.8 + U * 3, H * 0.15 - U * 2, U * 6, sunset ? "#D9A08A" : N.navy); for (let i = 0; i < 14; i++) { const tw = 0.5 + 0.5 * Math.sin(D.t * 0.8 + i); R((i * 137) % W, ((i * 71) % (gy * 0.5)) + U * 4, U, U, `rgba(250,246,238,${0.3 + tw * 0.5})`); } }
    R(0, gy, W, H - gy, this.sc === 3 ? "#4E6B55" : N.field);
    const u = Math.max(2, Math.floor(Math.min(W / 70, H / 40)));
    switch (this.sc) {
      case 0: palm(W * 0.1, gy, u); place("home", W * 0.32, gy, u); veh("jeep", W * 0.6, gy + u * 2, u * 1.4 | 0, C.green, { lights: this.tapFx > 0.6 }); break;
      case 1: { R(W * 0.45, gy - 22 * u, 40 * u, 22 * u, N.lilac); R(W * 0.45, gy - 24 * u, 40 * u, 3 * u, C.k); const bx = Math.min(W * 0.62, W * 0.1 + this.st * W * 0.06); veh("bus", bx, gy + u * 2, u, C.blue, { lights: this.tapFx <= 0 }); if (this.tapFx > 0) R(bx + 9 * u, gy - 8 * u, 3 * u, 5 * u, C.k); break; }
      case 2: { const tx = W * 0.3; R(tx, gy - 30 * u, 3 * u, 30 * u, "#5b4a3a"); pcirc(tx + u, gy - 32 * u, 14 * u, "#3f5a47", u); veh("lorry", W * 0.58, gy + u * 2, u, C.yellow, { lights: this.lights > 0 }); if (this.lights > 1) pcirc(W * 0.58 + 13 * u, gy - 6 * u, u * 1.5, N.lamp, u); txt("z", W * 0.58 + 6 * u, gy - 20 * u - Math.sin(D.t) * u * 2, u * 4, N.cream, "center", false); break; }
      case 3: { for (let i = 0; i < 12; i++) R((i * W) / 12, gy + u * 2, u, u * 3, "#7a9a6a"); R(0, gy - u, W, u, "#6b6f86"); const x = ((this.st * W * 0.05) % (W * 1.6)) - W * 0.3; veh("train", x, gy - u, u, C.red, { lights: true }); for (const p of this.puffs) star(p.x, p.y, u * (1 + Math.min(2, p.t)), `rgba(250,246,238,${Math.max(0, 1 - p.t / 6)})`, false); break; }
      case 4: { veh("moto", W * 0.5, gy + u * 2, u * 1.6 | 0, C.red); const s = this.tapFx > 0 ? 0 : 1; g.fillStyle = N.lilac; g.beginPath(); g.ellipse(W * 0.5, gy - 8 * u - s * u * 2, 14 * u, 9 * u, 0, Math.PI, 0); g.fill(); R(W * 0.5 - 14 * u, gy - 8 * u - s * u * 2, 28 * u, 7 * u + s * u * 2, N.lilac); break; }
      case 5: case 6: case 7: {
        const kinds = ["jeep", "bus", "lorry", "moto"], cols = [C.green, C.blue, C.yellow, C.red];
        kinds.forEach((k, i) => veh(k, W * (0.15 + i * 0.23), gy + u * 2, u, cols[i], { lights: this.sc === 5 || (this.sc === 6 && this.st < 20 - i * 4) }));
        if (this.sc === 5) for (let i = 0; i < this.stars; i++) star(W * (0.2 + i * 0.15), H * 0.22, U * 3, N.lamp, false);
        if (this.sc >= 6) R(0, 0, W, H, `rgba(10,12,24,${Math.min(0.6, this.st / 60 + (this.sc === 7 ? 0.4 : 0))})`);
        break;
      }
    }
    R(0, 0, W, H, `rgba(11,14,24,${1 - this.fade})`);
    if (this.showReplay) this.ui(); else this.dimHome();
  }
  dimHome() { const h = this.homeB; g.globalAlpha = 0.35; btnBox(h.x, h.y, h.w, h.h, N.lilac); homeIcon(h.x + h.w * 0.12, h.y + h.h * 0.1, h.w * 0.76); g.globalAlpha = 1; }
  ui() { this.dimHome(); const r = this.replay; btnBox(r.x, r.y, r.w, r.h, N.lilac); star(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3, N.lamp); }
  down(p: Pt) {
    if (hit(p, this.homeB, 4)) { goHome(); return; }
    if (hit(p, this.parB, 8)) { this.showReplay = !this.showReplay; return; }
    if (this.showReplay && hit(p, this.replay)) { this.leave(); this.enter(); return; }
    if (this.off) return;
    // one gentle optional tap per scene
    this.tapFx = 1.2;
    switch (this.sc) {
      case 0: soft("blink"); break;
      case 1: soft("pssh"); break;
      case 2: if (this.lights > 0) { this.lights--; soft("blink"); } break;
      case 3: soft("choo"); this.puffs.push({ x: p.x, y: p.y, t: 0 }); break;
      case 4: soft("tuck"); break;
      case 5: if (this.stars < 5) { this.stars++; bell(523 + this.stars * 60, 0.8, 0.04); } break;
    }
  }
}
