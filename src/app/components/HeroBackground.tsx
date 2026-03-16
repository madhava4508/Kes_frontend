import { useEffect, useRef, useCallback } from "react";

/**
 * HeroAnimation — right-panel canvas
 * ─────────────────────────────────────────────────
 * Three nodes rendered with crisp inline-SVG images:
 *
 *   Documents  (bottom-left)
 *   Cloud      (bottom-right)
 *   SecureVault (top-center)
 *
 * Two-act animation cycle:
 *
 *   ACT 1 — UNSECURED:
 *     Doc appears at Documents → flies directly to Cloud (bypassing vault).
 *     Cloud flashes a red "unsecured" warning (X mark + red glow).
 *
 *   ACT 2 — SECURED:
 *     Doc appears at Documents → flies to SecureVault (top-center).
 *     Vault pulses (secured). Then doc flies from SecureVault → Cloud.
 *     Cloud shows a white "secured" check mark.
 *
 * Guide arcs gently pulse between nodes.  Cursor glow follows mouse.
 */

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function cubicBezier(
  t: number,
  p0: [number, number], p1: [number, number],
  p2: [number, number], p3: [number, number],
): [number, number] {
  const u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
  ];
}
function hexCol(h: string) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ─────────────────────────────────────────────────
// Palette — neutral white/gray theme + warning red
// ─────────────────────────────────────────────────
const WHITE  = "#EBEBEB";
const SILVER = "#AAAAAA";
const GRAY   = "#888888";
const RED    = "#E53E3E";
const GREEN  = "#4ADE80";
const DIM    = "rgba(255,255,255,0.38)";

const DOC_COLORS = [WHITE, SILVER, GRAY];
const DOC_LABELS = ["report.pdf", "keys.env", "schema.sql"];

// ─────────────────────────────────────────────────
// SVG image factories  (returns HTMLImageElement)
// Each SVG uses the neutral white/gray palette.
// ─────────────────────────────────────────────────

/** Folder / Documents icon SVG */
function makeFolderSVG(size: number, glowAlpha: number): HTMLImageElement {
  const g = hexCol(WHITE);
  const stroke = `rgba(${g.r},${g.g},${g.b},${lerp(0.35, 0.85, glowAlpha)})`;
  const fill   = `rgba(${g.r},${g.g},${g.b},${lerp(0.04, 0.14, glowAlpha)})`;
  const pageFill = `rgba(${g.r},${g.g},${g.b},${lerp(0.06, 0.16, glowAlpha)})`;
  const s = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 80 80">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="${lerp(1, 4, glowAlpha)}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(40,42,54,0.96)"/>
        <stop offset="100%" stop-color="rgba(27,27,34,0.92)"/>
      </linearGradient>
    </defs>
    <!-- folder body -->
    <path d="M4 22 L28 22 L34 28 L76 28 L76 68 L4 68 Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.8"
      filter="url(#glow)"/>
    <!-- tab -->
    <path d="M4 22 L28 22 L34 28 L4 28 Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
    <!-- page lines inside folder -->
    <rect x="14" y="36" width="30" height="2.5" rx="1" fill="${pageFill}"/>
    <rect x="14" y="43" width="40" height="2.5" rx="1" fill="${pageFill}"/>
    <rect x="14" y="50" width="24" height="2.5" rx="1" fill="${pageFill}"/>
  </svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img;
}

/** Hexagonal vault / lock icon SVG */
function makeVaultSVG(size: number, glowAlpha: number): HTMLImageElement {
  const g = hexCol(WHITE);
  const baseG = 0.45;
  const eff = clamp(baseG + glowAlpha * 0.55, 0, 1);
  const stroke = `rgba(${g.r},${g.g},${g.b},${lerp(0.22, 0.80, eff)})`;
  const fill   = `rgba(${g.r},${g.g},${g.b},${lerp(0.04, 0.15, eff)})`;
  const lock   = `rgba(${g.r},${g.g},${g.b},${lerp(0.45, 0.95, eff)})`;
  const blur   = lerp(1, 6, eff);
  const s = size;
  const pts = Array.from({length: 6}, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    return `${40 + Math.cos(a) * 34},${40 + Math.sin(a) * 34}`;
  }).join(" ");
  const pts2 = Array.from({length: 6}, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    return `${40 + Math.cos(a) * 24},${40 + Math.sin(a) * 24}`;
  }).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 80 80">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="${blur}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="2"
      filter="url(#glow)"/>
    <polygon points="${pts2}" fill="none" stroke="${stroke}" stroke-width="1"
      opacity="0.5"/>
    <rect x="29" y="42" width="22" height="16" rx="3"
      fill="none" stroke="${lock}" stroke-width="2.2"
      stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M33 42 L33 36 A7 7 0 0 1 47 36 L47 42"
      fill="none" stroke="${lock}" stroke-width="2.2"
      stroke-linecap="round"/>
    <circle cx="40" cy="51" r="2.5" fill="${lock}"/>
  </svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img;
}

/** Cloud icon SVG */
function makeCloudSVG(size: number, glowAlpha: number): HTMLImageElement {
  const g = hexCol(SILVER);
  const eff = clamp(glowAlpha, 0, 1);
  const stroke = `rgba(${g.r},${g.g},${g.b},${lerp(0.20, 0.65, eff)})`;
  const fill   = `rgba(${g.r},${g.g},${g.b},${lerp(0.07, 0.22, eff)})`;
  const blur   = lerp(1, 5, eff);
  const s = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 80 80">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="${blur}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="
      M20 56
      A14 14 0 0 1 20 28
      A10 10 0 0 1 34 20
      A12 12 0 0 1 58 24
      A10 10 0 0 1 62 44
      A10 10 0 0 1 52 56
      Z"
      fill="${fill}" stroke="${stroke}" stroke-width="2"
      stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M40 48 L40 34 M34 40 L40 34 L46 40"
      fill="none" stroke="${stroke}" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round"
      opacity="${lerp(0.3, 0.8, eff)}"/>
  </svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img;
}

/** Flying document icon SVG */
function makeDocSVG(size: number, col: string): HTMLImageElement {
  const c = hexCol(col);
  const stroke = `rgba(${c.r},${c.g},${c.b},0.75)`;
  const fill   = `rgba(${c.r},${c.g},${c.b},0.14)`;
  const line   = `rgba(${c.r},${c.g},${c.b},0.30)`;
  const s = size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 48 60">
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M2 2 L34 2 L46 14 L46 58 L2 58 Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.5"
      stroke-linejoin="round" filter="url(#glow)"/>
    <path d="M34 2 L34 14 L46 14"
      fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="0.6"/>
    <rect x="8" y="22" width="26" height="2.2" rx="1" fill="${line}"/>
    <rect x="8" y="29" width="32" height="2.2" rx="1" fill="${line}"/>
    <rect x="8" y="36" width="20" height="2.2" rx="1" fill="${line}"/>
  </svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return img;
}

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

/**
 * Phase machine for two-act animation:
 *
 * ACT 1 (unsecured):
 *   unsecured-appear → fly-to-cloud-direct → cloud-warn → warn-fade
 *
 * ACT 2 (secured):
 *   secured-appear → fly-to-vault → vault-pulse → fly-to-cloud-via-vault → cloud-secure → secure-fade
 *
 * cooldown → back to act 1
 */
type Phase =
  | "unsecured-appear"
  | "fly-to-cloud-direct"
  | "cloud-warn"
  | "warn-fade"
  | "secured-appear"
  | "fly-to-vault"
  | "vault-pulse"
  | "fly-to-cloud-via-vault"
  | "cloud-secure"
  | "secure-fade"
  | "cooldown";

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; col: string; sz: number;
}

interface FlyDoc {
  col: string; label: string;
  img: HTMLImageElement;
  p0: [number,number]; p1: [number,number];
  p2: [number,number]; p3: [number,number];
  t: number; speed: number;
  angle: number; angleTarget: number;
}

// ─────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────
export function HeroAnimation() {
  const ref   = useRef<HTMLCanvasElement>(null);
  const raf   = useRef(0);
  const mouse = useRef({ x: -9999, y: -9999 });

  const onMove = useCallback((e: MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);
  const onLeave = useCallback(() => { mouse.current = { x: -9999, y: -9999 }; }, []);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx    = canvas.getContext("2d")!;
    let W = 0, H = 0;

    // Node positions — filled by layout()
    // NEW LAYOUT: Documents bottom-left, Cloud bottom-right, SecureVault top-center
    let DOC = { x: 0, y: 0 };   // Documents   (bottom-left)
    let CLD = { x: 0, y: 0 };   // Cloud        (bottom-right)
    let VAU = { x: 0, y: 0 };   // SecureVault  (top-center)
    let SC  = 1;

    function layout() {
      const dpr = devicePixelRatio || 1;
      const r   = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      SC  = clamp(Math.min(W / 480, H / 500), 0.45, 1.5);
      DOC = { x: W * 0.20, y: H * 0.72 };   // bottom-left
      CLD = { x: W * 0.80, y: H * 0.72 };   // bottom-right
      VAU = { x: W * 0.50, y: H * 0.18 };   // top-center
    }

    // ── State ──
    let phase: Phase    = "unsecured-appear";
    let timer           = 0;
    let tick            = 0;
    let docIdx          = 0;
    let docAppearAlpha  = 0;
    let docGlow         = 0;
    let vaultGlow       = 0;
    let cloudGlow       = 0;
    let warnAlpha       = 0;   // red "unsecured" indicator at cloud
    let secureAlpha     = 0;   // white "secured" check at cloud
    let flyDoc: FlyDoc | null = null;
    const parts: Particle[] = [];

    // ── SVG image caches ──
    const folderImgDim   = makeFolderSVG(80, 0);
    const folderImgBright= makeFolderSVG(80, 1);
    const vaultImgDim    = makeVaultSVG(88, 0);
    const vaultImgBright = makeVaultSVG(88, 1);
    const cloudImgDim    = makeCloudSVG(80, 0);
    const cloudImgBright = makeCloudSVG(80, 1);
    const docImgs = DOC_COLORS.map(c => makeDocSVG(48, c));

    // ── Helpers ──
    function burst(x: number, y: number, col: string, n = 12) {
      for (let i = 0; i < n; i++) {
        const a  = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const sp = (0.5 + Math.random() * 1.3) * SC;
        parts.push({ x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, col, sz: (1.0 + Math.random() * 1.8) * SC });
      }
    }

    function drawNode(
      cx: number, cy: number, ds: number,
      dimImg: HTMLImageElement, brightImg: HTMLImageElement,
      glow: number, pulse: number = 1
    ) {
      const half = (ds * pulse) / 2;
      ctx.save();
      ctx.globalAlpha = 1 - glow;
      ctx.drawImage(dimImg, cx - half, cy - half, ds * pulse, ds * pulse);
      ctx.globalAlpha = glow;
      ctx.drawImage(brightImg, cx - half, cy - half, ds * pulse, ds * pulse);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawFlyingDoc(
      cx: number, cy: number, idx: number,
      alpha: number, angle: number, scale: number = 1
    ) {
      const img = docImgs[idx % 3];
      const ds = 48 * SC * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.shadowColor = DOC_COLORS[idx % 3];
      ctx.shadowBlur  = 16 * SC;
      ctx.drawImage(img, -ds * 0.5, -ds * 0.5, ds, ds);
      ctx.restore();
    }

    function drawNodeGlow(cx: number, cy: number, col: string, radius: number, alpha: number) {
      if (alpha < 0.005) return;
      const c = hexCol(col);
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${alpha})`);
      grd.addColorStop(0.5, `rgba(${c.r},${c.g},${c.b},${alpha * 0.35})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    function drawLabel(cx: number, cy: number, text: string, col: string, bright: number) {
      ctx.save();
      ctx.font = `${12 * SC}px 'Inter',sans-serif`;
      ctx.textAlign = "center";
      const c = hexCol(col);
      ctx.fillStyle = bright > 0.4
        ? `rgba(${c.r},${c.g},${c.b},${lerp(0.5, 0.9, bright)})`
        : DIM;
      ctx.fillText(text, cx, cy);
      ctx.restore();
    }

    function drawGuide(
      ax: number, ay: number,
      bx: number, by: number,
      alpha: number
    ) {
      const mx = (ax + bx) / 2 - (by - ay) * 0.25;
      const my = (ay + by) / 2 - (bx - ax) * 0.25;
      ctx.save();
      ctx.setLineDash([5 * SC, 10 * SC]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawCursorGlow() {
      const { x, y } = mouse.current;
      if (x < -999) return;
      const radius = 180 * SC;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0,   "rgba(255,255,255,0.07)");
      g.addColorStop(0.5, "rgba(255,255,255,0.025)");
      g.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // ── Status label in the centroid of the three nodes ──
    // cx/cy = centroid of DOC, CLD, VAU = (W*0.50, H*0.54)
    function drawStatusLabel(text: string, col: string, alpha: number) {
      if (alpha < 0.005) return;
      const cx = (DOC.x + CLD.x + VAU.x) / 3;
      const cy = (DOC.y + CLD.y + VAU.y) / 3;
      const c = hexCol(col);
      const fontSize = clamp(32 * SC, 18, 52);
      // Radial glow behind text
      const glowR = fontSize * 3;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${alpha * 0.18})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
      // Text
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${fontSize}px 'Inter',sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18 * SC;
      ctx.fillText(text, cx, cy);
      ctx.restore();
    }

    // ── Phase machine ──
    function stepPhase() {
      timer++;
      switch (phase) {

        // ═══════════════════════════════════════════
        // ACT 1 — UNSECURED: Doc → Cloud directly
        // ═══════════════════════════════════════════

        case "unsecured-appear": {
          docAppearAlpha = clamp(timer / 38, 0, 1);
          docGlow = clamp(timer / 38, 0, 1);
          if (timer > 42) {
            const col = DOC_COLORS[docIdx % 3];
            const label = DOC_LABELS[docIdx % 3];
            // Fly directly from Documents → Cloud (bottom-left → bottom-right)
            const p0: [number,number] = [DOC.x, DOC.y];
            const p1: [number,number] = [DOC.x + 80*SC, DOC.y - 180*SC];
            const p2: [number,number] = [CLD.x - 80*SC, CLD.y - 180*SC];
            const p3: [number,number] = [CLD.x, CLD.y];
            flyDoc = {
              col, label, img: docImgs[docIdx % 3],
              p0, p1, p2, p3,
              t: 0, speed: 0.0050 + Math.random() * 0.0015,
              angle: 0, angleTarget: (Math.random() - 0.5) * 0.4,
            };
            phase = "fly-to-cloud-direct";
            timer = 0;
          }
          break;
        }

        case "fly-to-cloud-direct": {
          docAppearAlpha = clamp(1 - timer / 20, 0, 1);
          docGlow = clamp(1 - timer / 60, 0, 1);
          if (flyDoc && flyDoc.t >= 1) {
            burst(CLD.x, CLD.y, RED, 16);
            cloudGlow = 1;
            warnAlpha = 1;
            flyDoc = null;
            docAppearAlpha = 0;
            docGlow = 0;
            phase = "cloud-warn";
            timer = 0;
          }
          break;
        }

        case "cloud-warn": {
          cloudGlow = clamp(1 - timer / 80, 0, 1);
          // Warning stays visible
          warnAlpha = clamp(1 - timer / 120, 0, 1);
          if (timer > 100) {
            phase = "warn-fade";
            timer = 0;
          }
          break;
        }

        case "warn-fade": {
          warnAlpha = clamp(1 - timer / 40, 0, 1);
          if (timer > 50) {
            docIdx++;
            warnAlpha = 0;
            phase = "secured-appear";
            timer = 0;
          }
          break;
        }

        // ═══════════════════════════════════════════
        // ACT 2 — SECURED: Doc → SecureVault → Cloud
        // ═══════════════════════════════════════════

        case "secured-appear": {
          docAppearAlpha = clamp(timer / 38, 0, 1);
          docGlow = clamp(timer / 38, 0, 1);
          if (timer > 42) {
            const col = DOC_COLORS[docIdx % 3];
            const label = DOC_LABELS[docIdx % 3];
            // Fly from Documents → SecureVault (bottom-left → top-center)
            const p0: [number,number] = [DOC.x, DOC.y];
            const p1: [number,number] = [DOC.x + 40*SC, DOC.y - 220*SC];
            const p2: [number,number] = [VAU.x - 80*SC, VAU.y + 120*SC];
            const p3: [number,number] = [VAU.x, VAU.y];
            flyDoc = {
              col, label, img: docImgs[docIdx % 3],
              p0, p1, p2, p3,
              t: 0, speed: 0.0050 + Math.random() * 0.0015,
              angle: 0, angleTarget: (Math.random() - 0.5) * 0.4,
            };
            phase = "fly-to-vault";
            timer = 0;
          }
          break;
        }

        case "fly-to-vault": {
          docAppearAlpha = clamp(1 - timer / 20, 0, 1);
          docGlow = clamp(1 - timer / 60, 0, 1);
          if (flyDoc && flyDoc.t >= 1) {
            burst(VAU.x, VAU.y, flyDoc.col, 16);
            vaultGlow = 1;
            flyDoc = null;
            docAppearAlpha = 0;
            docGlow = 0;
            phase = "vault-pulse";
            timer = 0;
          }
          break;
        }

        case "vault-pulse": {
          vaultGlow = clamp(1 - timer / 80, 0, 1);
          if (timer > 88) {
            const col = DOC_COLORS[docIdx % 3];
            const label = DOC_LABELS[docIdx % 3];
            // Fly from SecureVault → Cloud (top-center → bottom-right)
            const p0: [number,number] = [VAU.x, VAU.y];
            const p1: [number,number] = [VAU.x + 80*SC, VAU.y + 120*SC];
            const p2: [number,number] = [CLD.x - 40*SC, CLD.y - 220*SC];
            const p3: [number,number] = [CLD.x, CLD.y];
            flyDoc = {
              col, label, img: docImgs[docIdx % 3],
              p0, p1, p2, p3,
              t: 0, speed: 0.0055 + Math.random() * 0.0015,
              angle: 0, angleTarget: (Math.random() - 0.5) * 0.35,
            };
            phase = "fly-to-cloud-via-vault";
            timer = 0;
          }
          break;
        }

        case "fly-to-cloud-via-vault": {
          if (flyDoc && flyDoc.t >= 1) {
            burst(CLD.x, CLD.y, flyDoc.col, 14);
            cloudGlow = 1;
            secureAlpha = 1;
            flyDoc = null;
            phase = "cloud-secure";
            timer = 0;
          }
          break;
        }

        case "cloud-secure": {
          cloudGlow = clamp(1 - timer / 80, 0, 1);
          secureAlpha = clamp(1 - timer / 120, 0, 1);
          if (timer > 100) {
            phase = "secure-fade";
            timer = 0;
          }
          break;
        }

        case "secure-fade": {
          secureAlpha = clamp(1 - timer / 40, 0, 1);
          if (timer > 50) {
            docIdx++;
            secureAlpha = 0;
            phase = "cooldown";
            timer = 0;
          }
          break;
        }

        case "cooldown": {
          if (timer > 50) {
            docAppearAlpha = 0;
            phase = "unsecured-appear";
            timer = 0;
          }
          break;
        }
      }
    }

    // ── Main render loop ──
    function frame() {
      raf.current = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      tick++;
      stepPhase();

      // Cursor glow
      drawCursorGlow();

      // Guide arcs — show the two paths:
      //   Doc → Cloud (direct, unsecured path)
      //   Doc → Vault → Cloud (secured path)
      const gA = 0.06 + 0.04 * Math.sin(tick * 0.018);
      // Direct path: Doc → Cloud (faint, shown as the "wrong" way)
      drawGuide(DOC.x, DOC.y, CLD.x, CLD.y, gA * 0.6);
      // Secured path: Doc → Vault, Vault → Cloud
      drawGuide(DOC.x, DOC.y, VAU.x, VAU.y, gA);
      drawGuide(VAU.x, VAU.y, CLD.x, CLD.y, gA);

      // ── Documents node (bottom-left) ──
      const nodeSize = 80 * SC;
      drawNodeGlow(DOC.x, DOC.y, WHITE, nodeSize * 1.6, lerp(0.08, 0.22, docGlow));
      drawNode(DOC.x, DOC.y, nodeSize, folderImgDim, folderImgBright, docGlow, 1);
      drawLabel(DOC.x, DOC.y + nodeSize * 0.58, "Documents", WHITE, docGlow);

      // ── SecureVault node (top-center) ──
      const vSize = 88 * SC;
      const vPulse = 1 + Math.sin(tick * 0.035) * 0.04 * clamp(0.45 + vaultGlow * 0.55, 0, 1);
      drawNodeGlow(VAU.x, VAU.y, WHITE, vSize * 1.8,
        lerp(0.07, 0.20, clamp(0.45 + vaultGlow * 0.55, 0, 1)));
      drawNode(VAU.x, VAU.y, vSize, vaultImgDim, vaultImgBright,
        clamp(0.45 + vaultGlow * 0.55, 0, 1), vPulse);
      drawLabel(VAU.x, VAU.y + vSize * 0.60,
        "SecureVault", WHITE, clamp(0.45 + vaultGlow * 0.55, 0, 1));

      // ── Cloud node (bottom-right) ──
      const cSize = 80 * SC;
      const cPulse = 1 + Math.sin(tick * 0.04) * 0.025;
      drawNodeGlow(CLD.x, CLD.y, SILVER, cSize * 1.8, lerp(0.04, 0.16, cloudGlow));
      drawNode(CLD.x, CLD.y, cSize, cloudImgDim, cloudImgBright, cloudGlow, cPulse);
      drawLabel(CLD.x, CLD.y + cSize * 0.60, "Cloud", SILVER, cloudGlow);

      // ── Document appearing at source ──
      if ((phase === "unsecured-appear" || phase === "secured-appear") && docAppearAlpha > 0) {
        drawFlyingDoc(DOC.x, DOC.y, docIdx, docAppearAlpha, 0, 0.8);
      }

      // ── Flying document + trail ──
      if (flyDoc) {
        flyDoc.t = Math.min(flyDoc.t + flyDoc.speed, 1);
        const et = easeInOutCubic(flyDoc.t);
        flyDoc.angle = lerp(
          flyDoc.angle,
          flyDoc.angleTarget * Math.sin(flyDoc.t * Math.PI),
          0.10
        );
        const [px, py] = cubicBezier(et, flyDoc.p0, flyDoc.p1, flyDoc.p2, flyDoc.p3);

        // Glowing dot trail
        const TRAIL = 14;
        const tc = hexCol(flyDoc.col);
        for (let s = 1; s <= TRAIL; s++) {
          const tt  = Math.max(0, flyDoc.t - s * 0.013);
          const tet = easeInOutCubic(tt);
          const [tx, ty] = cubicBezier(tet, flyDoc.p0, flyDoc.p1, flyDoc.p2, flyDoc.p3);
          const ta  = ((TRAIL - s) / TRAIL) * 0.22 * (1 - s * 0.035);
          const tr  = clamp((3.2 - s * 0.18) * SC, 0.3, 4);
          ctx.beginPath();
          ctx.arc(tx, ty, tr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${tc.r},${tc.g},${tc.b},${Math.max(0, ta)})`;
          ctx.fill();
        }

        drawFlyingDoc(px, py, docIdx, 0.92, flyDoc.angle);
      }

      // ── Status label in centroid of all three nodes ──
      if (warnAlpha > 0) {
        drawStatusLabel("Unsecured", RED, warnAlpha);
      }
      if (secureAlpha > 0) {
        drawStatusLabel("Secured", GREEN, secureAlpha);
      }

      // ── Particles ──
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= 0.016;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const pc = hexCol(p.col);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pc.r},${pc.g},${pc.b},${p.life * 0.55})`;
        ctx.fill();
      }
    }

    layout();
    raf.current = requestAnimationFrame(frame);
    window.addEventListener("resize", layout);

    const parent = canvas.parentElement;
    parent?.addEventListener("mousemove", onMove as EventListener);
    parent?.addEventListener("mouseleave", onLeave as EventListener);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", layout);
      parent?.removeEventListener("mousemove", onMove as EventListener);
      parent?.removeEventListener("mouseleave", onLeave as EventListener);
    };
  }, [onMove, onLeave]);

  return (
    <canvas
      ref={ref}
      className="w-full h-full"
      style={{ display: "block", pointerEvents: "none" }}
    />
  );
}
