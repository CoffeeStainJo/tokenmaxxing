import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/* ============================================================================
   CREDIT RUNWAY — personal AI credit budget tracker
   Single-file React app. 40 000 credits = $400 / month (100 credits = $1).
   Budget is paced over WORKING DAYS only (Mon–Fri): weekends carry no
   allowance — usage on them still burns budget, but the glidepath is flat.
   ========================================================================== */

/* ============================ STYLES (injected, no separate .css) ========= */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;800&family=Inter:wght@400;500;600&display=swap');

:root{
  --void:#080B11;
  --panel:rgba(17,23,34,.72);
  --panel-solid:#11161F;
  --line:#1E2838;
  --line-bright:#2B3A50;
  --text:#E8EEF6;
  --muted:#8493A8;
  --dim:#566580;
  --steel:#7C8BA6;

  /* status accent — overwritten on the root by React (the signature) */
  --accent:#34F5C5;
  --accent-2:#16d6ac;
  --glow:rgba(52,245,197,.55);
  --glow-soft:rgba(52,245,197,.14);
  --accent-ink:#062b24;

  --r:16px;
  --fast:.18s cubic-bezier(.4,0,.2,1);
  --slow:.5s cubic-bezier(.22,1,.36,1);
  --pad-bottom:env(safe-area-inset-bottom,0px);
}

*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  background:
    radial-gradient(1100px 620px at 80% -8%, var(--glow-soft), transparent 60%),
    radial-gradient(900px 500px at 0% 0%, rgba(124,139,166,.06), transparent 55%),
    linear-gradient(180deg,#0C111A 0%, var(--void) 55%);
  background-attachment:fixed;
  color:var(--text);
  font-family:'Inter',system-ui,sans-serif;
  min-height:100svh;
  -webkit-font-smoothing:antialiased;
  transition:background .6s ease;
}
::selection{background:var(--accent);color:var(--void);}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px;}

/* faint grid texture */
body::before{
  content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.5;
  background-image:
    linear-gradient(rgba(124,139,166,.035) 1px,transparent 1px),
    linear-gradient(90deg,rgba(124,139,166,.035) 1px,transparent 1px);
  background-size:46px 46px;
  mask-image:radial-gradient(circle at 50% 18%,#000 0%,transparent 78%);
  -webkit-mask-image:radial-gradient(circle at 50% 18%,#000 0%,transparent 78%);
}

.wrap{
  position:relative;z-index:1;
  max-width:1180px;margin:0 auto;
  padding:clamp(16px,3.5vw,40px);
  padding-bottom:calc(60px + var(--pad-bottom));
}

/* ---------- header ---------- */
header.deck-head{
  display:flex;align-items:center;justify-content:space-between;gap:18px;
  flex-wrap:wrap;margin-bottom:22px;
}
.brand{display:flex;align-items:center;gap:14px;min-width:0;}
.sigil{
  width:44px;height:44px;border-radius:12px;flex:0 0 auto;
  display:grid;place-items:center;position:relative;
  background:linear-gradient(150deg,rgba(255,255,255,.05),transparent);
  border:1px solid var(--line-bright);
  box-shadow:0 0 24px -6px var(--glow), inset 0 0 14px -8px var(--accent);
}
.sigil svg{width:24px;height:24px;}
.brand-txt h1{
  font-family:'Chakra Petch';font-weight:700;letter-spacing:.16em;
  font-size:clamp(15px,2.4vw,19px);margin:0;line-height:1;text-transform:uppercase;
}
.brand-txt .sub{
  font-family:'JetBrains Mono';font-size:11px;color:var(--muted);
  letter-spacing:.04em;margin-top:5px;
}
.brand-txt .sub b{color:var(--accent);font-weight:700;}

.head-right{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cycle-chip{
  font-family:'JetBrains Mono';font-size:11px;color:var(--muted);
  border:1px solid var(--line);border-radius:99px;padding:8px 13px;
  display:flex;align-items:center;gap:8px;background:var(--panel);
}
.cycle-chip b{color:var(--text);font-weight:700;}
.pulse-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);
  box-shadow:0 0 10px var(--glow);}
[data-status="red"] .pulse-dot{animation:pulse 1.1s infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}}

.status-pill{
  font-family:'Chakra Petch';font-weight:700;letter-spacing:.14em;font-size:12px;
  text-transform:uppercase;padding:9px 15px;border-radius:99px;
  color:var(--accent);background:var(--glow-soft);
  border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);
  box-shadow:0 0 22px -8px var(--glow);
  display:flex;align-items:center;gap:9px;
}

/* ---------- grid ---------- */
.grid{display:grid;gap:14px;grid-template-columns:repeat(12,1fr);}
.card{
  background:var(--panel);backdrop-filter:blur(14px);
  border:1px solid var(--line);border-radius:var(--r);
  padding:20px;position:relative;overflow:hidden;
  transition:border-color var(--slow),box-shadow var(--slow);
}
.card.lift{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 14%,transparent),
  0 26px 60px -30px var(--glow);border-color:color-mix(in srgb,var(--accent) 26%,var(--line));}
.card-label{
  font-family:'Chakra Petch';font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;font-size:10.5px;color:var(--dim);
  display:flex;align-items:center;gap:8px;margin-bottom:2px;
}
.card-label::before{content:"";width:14px;height:1px;background:var(--line-bright);}

.col-hero{grid-column:span 5;}
.col-chart{grid-column:span 7;}
.col-3{grid-column:span 3;}
.col-12{grid-column:span 12;}

/* ---------- gauge ---------- */
.gauge-wrap{display:flex;flex-direction:column;align-items:center;}
.gauge-stage{position:relative;width:100%;max-width:340px;}
.gauge-readout{
  position:absolute;left:0;right:0;bottom:6px;text-align:center;pointer-events:none;
}
.gauge-pct{
  font-family:'JetBrains Mono';font-weight:800;
  font-size:clamp(40px,9vw,56px);line-height:.9;letter-spacing:-.02em;
  color:var(--text);text-shadow:0 0 30px var(--glow-soft);
}
.gauge-pct .unit{font-size:.42em;color:var(--accent);margin-left:2px;font-weight:700;}
.gauge-sub{font-family:'JetBrains Mono';font-size:12px;color:var(--muted);margin-top:7px;}
.gauge-sub b{color:var(--text);}
.gauge-legend{
  display:flex;gap:18px;justify-content:center;margin-top:6px;flex-wrap:wrap;
  font-family:'JetBrains Mono';font-size:10.5px;color:var(--muted);letter-spacing:.02em;
}
.gauge-legend span{display:flex;align-items:center;gap:6px;}
.lg-actual{width:14px;height:4px;border-radius:2px;background:var(--accent);box-shadow:0 0 8px var(--glow);}
.lg-ideal{width:14px;height:0;border-top:2px dashed var(--steel);}

/* ---------- chart ---------- */
.chart-card{display:flex;flex-direction:column;}
.chart-legend{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:6px;
  font-family:'JetBrains Mono';font-size:10.5px;color:var(--muted);letter-spacing:.02em;}
.chart-legend span{display:flex;align-items:center;gap:7px;}
.ck{width:16px;height:3px;border-radius:2px;display:inline-block;}
.ck.actual{background:var(--accent);box-shadow:0 0 8px var(--glow);}
.ck.ideal{background:transparent;border-top:2px dashed var(--steel);height:0;}
.ck.proj{background:transparent;border-top:2px dotted var(--accent);height:0;opacity:.85;}
.chart-svg{width:100%;height:auto;display:block;margin-top:4px;}

/* ---------- stats ---------- */
.stat .num{font-family:'JetBrains Mono';font-weight:800;
  font-size:clamp(24px,3.6vw,30px);line-height:1;letter-spacing:-.01em;margin-top:14px;}
.stat .num .small{font-size:.5em;color:var(--muted);font-weight:500;letter-spacing:0;}
.stat .note{font-family:'JetBrains Mono';font-size:11px;color:var(--muted);margin-top:9px;
  display:flex;align-items:center;gap:6px;}
.stat .note.good{color:var(--accent);}
.stat .note.warn{color:#FFB838;}
.stat .note.bad{color:#FF4D6D;}
.accent-num{color:var(--accent);}

/* ---------- input ---------- */
.input-row{display:flex;gap:12px;align-items:stretch;flex-wrap:wrap;margin-top:14px;}
.field{
  flex:1 1 240px;position:relative;display:flex;align-items:center;
  background:#0B0F16;border:1px solid var(--line-bright);border-radius:12px;
  transition:border-color var(--fast),box-shadow var(--fast);overflow:hidden;
}
.field:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--glow-soft);}
.field .caret{font-family:'JetBrains Mono';color:var(--accent);font-weight:700;
  padding:0 4px 0 16px;font-size:16px;}
.field input{
  flex:1;background:transparent;border:0;outline:0;color:var(--text);
  font-family:'JetBrains Mono';font-weight:700;font-size:17px;letter-spacing:.01em;
  padding:16px 14px 16px 4px;width:100%;
}
.field input::placeholder{color:var(--dim);font-weight:500;}
.btn{
  flex:0 0 auto;font-family:'Chakra Petch';font-weight:700;letter-spacing:.1em;
  text-transform:uppercase;font-size:13px;padding:0 24px;border-radius:12px;
  border:1px solid color-mix(in srgb,var(--accent) 55%,transparent);cursor:pointer;
  background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 26%,#0b0f16),#0b0f16);
  color:var(--accent);box-shadow:0 0 22px -10px var(--glow);
  transition:transform var(--fast),box-shadow var(--fast),background var(--fast);
  min-height:54px;
}
.btn:hover{transform:translateY(-1px);box-shadow:0 0 28px -8px var(--glow);
  background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 40%,#0b0f16),#0b0f16);}
.btn:active{transform:translateY(0);}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none;}
.field-hint{font-family:'JetBrains Mono';font-size:11.5px;margin-top:11px;color:var(--muted);
  min-height:16px;letter-spacing:.01em;}
.field-hint.ok{color:var(--accent);}
.field-hint.err{color:#FF4D6D;}
.field-hint b{color:var(--text);font-weight:700;}
.quick{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;}
.chip-btn{font-family:'JetBrains Mono';font-size:11px;color:var(--muted);
  background:transparent;border:1px solid var(--line);border-radius:8px;
  padding:6px 11px;cursor:pointer;transition:all var(--fast);}
.chip-btn:hover{border-color:var(--accent);color:var(--accent);}

/* ---------- status banner ---------- */
.banner{
  grid-column:span 12;display:flex;align-items:center;gap:16px;
  border-radius:var(--r);padding:16px 20px;
  background:linear-gradient(100deg,var(--glow-soft),transparent 70%);
  border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));
  box-shadow:inset 0 0 40px -22px var(--glow);
}
.banner .beacon{
  width:42px;height:42px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;
  background:var(--accent);color:var(--accent-ink);
  box-shadow:0 0 26px -4px var(--glow);
}
[data-status="red"] .banner .beacon{animation:pulse 1.1s infinite;}
.banner .beacon svg{width:22px;height:22px;}
.banner-txt strong{font-family:'Chakra Petch';letter-spacing:.12em;text-transform:uppercase;
  font-size:13px;color:var(--accent);display:block;margin-bottom:3px;}
.banner-txt span{font-size:13.5px;color:var(--text);line-height:1.4;}

/* ---------- history ---------- */
.hist-head{display:flex;align-items:center;justify-content:space-between;cursor:pointer;
  user-select:none;gap:12px;background:transparent;border:0;width:100%;padding:0;
  color:inherit;text-align:left;font:inherit;}
.hist-head .meta{font-family:'JetBrains Mono';font-size:11.5px;color:var(--muted);}
.chev{transition:transform var(--fast);color:var(--muted);}
.chev.open{transform:rotate(90deg);color:var(--accent);}
.table{margin-top:16px;width:100%;border-collapse:collapse;}
.table th{font-family:'Chakra Petch';font-weight:600;letter-spacing:.12em;text-transform:uppercase;
  font-size:10px;color:var(--dim);text-align:left;padding:0 10px 10px;border-bottom:1px solid var(--line);}
.table th.r,.table td.r{text-align:right;}
.table td{font-family:'JetBrains Mono';font-size:13px;padding:12px 10px;
  border-bottom:1px solid rgba(30,40,56,.55);color:var(--text);vertical-align:middle;}
.table tr:last-child td{border-bottom:0;}
.day-tag{display:flex;flex-direction:column;gap:2px;}
.day-tag .dow{font-size:10px;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;}
.row-today{color:var(--accent);}
.pace-tag{font-family:'Chakra Petch';font-size:10px;font-weight:700;letter-spacing:.08em;
  padding:3px 8px;border-radius:6px;text-transform:uppercase;white-space:nowrap;}
.pace-tag.under{color:var(--accent);background:var(--glow-soft);}
.pace-tag.over{color:#FF4D6D;background:rgba(255,77,109,.12);}
.pace-tag.wknd{color:var(--steel);background:rgba(124,139,166,.12);}
.mini-bar{height:5px;border-radius:3px;background:#0B0F16;overflow:hidden;min-width:60px;
  border:1px solid var(--line);}
.mini-bar i{display:block;height:100%;border-radius:3px;
  background:linear-gradient(90deg,var(--accent),var(--accent-2));box-shadow:0 0 8px var(--glow);}
.icon-btn{background:transparent;border:1px solid var(--line);border-radius:8px;
  width:30px;height:30px;display:inline-grid;place-items:center;cursor:pointer;color:var(--muted);
  transition:all var(--fast);}
.icon-btn:hover{border-color:var(--accent);color:var(--accent);}
.icon-btn.danger:hover{border-color:#FF4D6D;color:#FF4D6D;}
.edit-input{font-family:'JetBrains Mono';font-weight:700;font-size:13px;width:100px;
  background:#0B0F16;border:1px solid var(--accent);border-radius:7px;color:var(--text);
  padding:6px 8px;outline:none;text-align:right;}
.empty-row{text-align:center;color:var(--dim);font-family:'JetBrains Mono';font-size:12.5px;padding:26px;}

.ghost-link{background:transparent;border:0;color:var(--dim);font-family:'JetBrains Mono';
  font-size:11px;cursor:pointer;letter-spacing:.04em;transition:color var(--fast);padding:4px;}
.ghost-link:hover{color:#FF4D6D;}

footer.deck-foot{margin-top:26px;text-align:center;font-family:'JetBrains Mono';
  font-size:10.5px;color:var(--dim);letter-spacing:.04em;}
footer.deck-foot b{color:var(--muted);}

@media (max-width:900px){
  .col-hero,.col-chart{grid-column:span 12;}
  .col-3{grid-column:span 6;}
}
@media (max-width:560px){
  .head-right{width:100%;justify-content:space-between;}
  .table .hide-sm{display:none;}
  .btn{flex:1 1 100%;}
}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important;}
}
`;

/* ============================ CONSTANTS ============================ */
const BUDGET = 40000;            // monthly credit budget
const DOLLARS = 400;             // $ equivalent -> 100 credits = $1
const STORE_KEY = "credit-runway-v2";      // v2: working-day pacing model
const C2D = (c) => c / (BUDGET / DOLLARS); // credits -> dollars

const STATUS = {
  green: {
    key: "green", label: "ON PACE", accent: "#34F5C5", a2: "#16d6ac",
    glow: "rgba(52,245,197,.55)", soft: "rgba(52,245,197,.14)", ink: "#062b24",
    msg: "Safe to continue utilizing AI services."
  },
  yellow: {
    key: "yellow", label: "WARNING", accent: "#FFB838", a2: "#f59e0b",
    glow: "rgba(255,184,56,.5)", soft: "rgba(255,184,56,.13)", ink: "#2b1d02",
    msg: "Approaching daily cap. Consider pacing your usage."
  },
  red: {
    key: "red", label: "ALERT", accent: "#FF4D6D", a2: "#e11d48",
    glow: "rgba(255,77,109,.5)", soft: "rgba(255,77,109,.13)", ink: "#2b0610",
    msg: "Daily limit reached. Pause heavy usage to avoid early depletion."
  },
};

/* ============================ DATE / CYCLE (working-day model) ============
   Budget is spread over Mon–Fri only. Weekends carry no allowance:
   the ideal glidepath is flat across them, and any weekend usage simply
   eats into the remaining workdays' targets.
   ========================================================================= */
const isWorkdayDate = (y, m, d) => {
  const wd = new Date(y, m, d).getDay(); // 0=Sun .. 6=Sat
  return wd >= 1 && wd <= 5;
};

function getCycle(now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dom = now.getDate();                       // 1..daysInMonth

  // wdThrough[d] = number of workdays in days 1..d (wdThrough[0] = 0)
  const wdThrough = [0];
  for (let d = 1; d <= daysInMonth; d++) {
    wdThrough[d] = wdThrough[d - 1] + (isWorkdayDate(y, m, d) ? 1 : 0);
  }
  const wdTotal = wdThrough[daysInMonth];          // workdays in the month
  const wdElapsed = wdThrough[dom];                // workdays through today (inclusive)
  const wdRemaining = wdTotal - wdThrough[dom - 1];// workdays left, today counts if Mon–Fri
  const todayIsWorkday = isWorkdayDate(y, m, dom);

  const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleString("nb-NO", { month: "long" });
  const todayKey = `${monthKey}-${String(dom).padStart(2, "0")}`;
  return {
    y, m, daysInMonth, dom, monthKey, monthName, todayKey,
    wdThrough, wdTotal, wdElapsed, wdRemaining, todayIsWorkday
  };
}

const fmtKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const dayNum = (key) => parseInt(key.slice(8), 10);
function labelFor(key) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    short: dt.toLocaleString("nb-NO", { day: "numeric", month: "short" }),
    dow: dt.toLocaleString("nb-NO", { weekday: "short" }),
    isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
  };
}
const fmt = (n) => Math.round(n).toLocaleString("nb-NO");
const fmtMoney = (c) => "$" + C2D(c).toLocaleString("nb-NO", { maximumFractionDigits: 0 });

/* ============================ STORAGE ============================ */
function readStore() {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; } // storage blocked -> in-memory only
}
function writeStore(obj) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }
  catch (e) { /* sandbox / private mode: silently fall back to in-memory */ }
}
/* Seed the 3 most recent workdays before today with plausible usage
   near the per-workday ideal, so gauge + chart render full on first load. */
function seedMock(cycle) {
  const ideal = BUDGET / Math.max(1, cycle.wdTotal);
  const factors = [0.78, 1.18, 0.92]; // applied oldest -> newest
  const days = [];
  for (let d = cycle.dom - 1; d >= 1 && days.length < 3; d--) {
    if (isWorkdayDate(cycle.y, cycle.m, d)) days.unshift(d);
  }
  return days.map((d, i) => ({
    id: "m" + i,
    date: fmtKey(cycle.y, cycle.m, d),
    amount: Math.round(ideal * factors[i + (3 - days.length)]),
  }));
}

/* ============================ INPUT PARSER ============================ */
function parseInput(raw) {
  const s = String(raw).trim().replace(/,/g, "").replace(/\s/g, "");
  if (!s) return { ok: false };
  if (s.endsWith("%")) {
    const n = parseFloat(s.slice(0, -1));
    if (isNaN(n) || n < 0) return { ok: false, error: "Enter a valid percentage, e.g. 20%." };
    if (n > 100) return { ok: false, error: "Percentage can't exceed 100% of the monthly budget." };
    return { ok: true, credits: Math.round(BUDGET * n / 100), kind: "percent", raw: n };
  }
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return { ok: false, error: "Enter credits (1500) or a percentage (20%)." };
  return { ok: true, credits: Math.round(n), kind: "absolute", raw: n };
}

/* ============================ HOOKS ============================ */
function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches); on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return r;
}
/* rAF-eased value (cubic ease-out); jumps instantly when reduced motion */
function useEased(target, dur = 650, start) {
  const reduce = useReducedMotion();
  const init = start === undefined ? target : start;
  const [val, setVal] = useState(init);
  const from = useRef(init), raf = useRef(0);
  useEffect(() => {
    if (reduce) { from.current = target; setVal(target); return; }
    const a = from.current, b = target, t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = a + (b - a) * e;
      setVal(cur); from.current = cur;
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, dur, reduce]);
  return val;
}

/* ============================ GAUGE ============================ */
function polar(cx, cy, r, pct) {               // pct 0..100 -> point on top semicircle
  const ang = Math.PI - (pct / 100) * Math.PI; // 0%=left(π), 100%=right(0)
  return { x: cx + r * Math.cos(ang), y: cy - r * Math.sin(ang) };
}
function Gauge({ monthlyPct, idealPct }) {
  const W = 320, cx = 160, cy = 158, R = 126, SW = 20;
  const L = Math.PI * R;
  const animPct = useEased(Math.min(100, monthlyPct), 900, 0); // sweep up from 0 on load
  const fill = Math.max(0, Math.min(100, animPct));
  const needle = polar(cx, cy, R, fill);
  const tick = polar(cx, cy, R, Math.min(100, idealPct));
  const tickIn = polar(cx, cy, R - SW - 5, Math.min(100, idealPct));
  const tickOut = polar(cx, cy, R + 7, Math.min(100, idealPct));
  const semiPath = `M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  return (
    <svg viewBox={`0 0 ${W} 178`} className="chart-svg" style={{ maxWidth: "340px" }} role="img"
      aria-label={`${Math.round(monthlyPct)} percent of monthly budget consumed; ideal is ${Math.round(idealPct)} percent`}>
      <defs>
        <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent-2)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
        <filter id="gBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* track */}
      <path d={semiPath} fill="none" stroke="#141A24" strokeWidth={SW} strokeLinecap="round" />
      <path d={semiPath} fill="none" stroke="var(--line)" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      {/* glow underlay */}
      <path d={semiPath} fill="none" stroke="var(--accent)" strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={`${(fill / 100) * L} ${L}`} opacity=".4" filter="url(#gBlur)" />
      {/* fill */}
      <path d={semiPath} fill="none" stroke="url(#gaugeFill)" strokeWidth={SW} strokeLinecap="round"
        strokeDasharray={`${(fill / 100) * L} ${L}`} />
      {/* IDEAL tick = share of the month's WORKDAYS elapsed */}
      <line x1={tickIn.x} y1={tickIn.y} x2={tickOut.x} y2={tickOut.y}
        stroke="var(--steel)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={tick.x} cy={tick.y} r="3" fill="var(--steel)" />
      <text x={tickOut.x} y={tickOut.y - 6} fill="var(--steel)" fontSize="9"
        fontFamily="Chakra Petch" letterSpacing="1.5"
        textAnchor={idealPct > 50 ? "end" : "start"}>IDEAL</text>
      {/* needle: hub + shaft to current fill, plus end-cap dot */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
        stroke="var(--accent)" strokeWidth="2" opacity=".45" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="4" fill="var(--line-bright)" />
      <circle cx={needle.x} cy={needle.y} r="5.5" fill="var(--accent)" filter="url(#gBlur)" opacity=".8" />
      <circle cx={needle.x} cy={needle.y} r="3.5" fill="#fff" />
    </svg>
  );
}

/* ============================ BURN-DOWN CHART =============================
   Ideal glidepath is a STAIRCASE over workdays (flat on weekends), built
   from cumulative ideal credits idealCum[d]. Projection extrapolates the
   current per-workday velocity to month-end.
   ========================================================================= */
function BurnChart({ cumulative, idealCum, today, daysInMonth, projTotal }) {
  const W = 600, H = 270, padL = 10, padR = 14, padT = 14, padB = 30;
  const plotW = W - padL - padR, plotH = H - padT - padB, yTop = padT, yBot = padT + plotH;
  const maxY = Math.max(BUDGET, projTotal, cumulative[today] || 0);
  const xFor = (d) => padL + (d / daysInMonth) * plotW;
  const yForRaw = (c) => yTop + (1 - c / maxY) * plotH;
  const yFor = (c) => Math.max(yTop - 2, Math.min(yBot, yForRaw(c)));

  // actual path (day 0 -> today)
  let actual = `M ${xFor(0)} ${yFor(0)}`;
  for (let d = 1; d <= today; d++) actual += ` L ${xFor(d)} ${yFor(cumulative[d])}`;
  const area = actual + ` L ${xFor(today)} ${yBot} L ${xFor(0)} ${yBot} Z`;

  // ideal glidepath: piecewise over workdays (flat segments on weekends)
  let ideal = `M ${xFor(0)} ${yFor(0)}`;
  for (let d = 1; d <= daysInMonth; d++) ideal += ` L ${xFor(d)} ${yFor(idealCum[d])}`;

  const cumToday = cumulative[today] || 0;
  const todayX = xFor(today), todayY = yFor(cumToday);
  const projY = yFor(projTotal);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    c: f * BUDGET, label: f === 0 ? "0" : fmt(f * BUDGET / 1000) + "k"
  }));
  const xTicks = [1, Math.ceil(daysInMonth / 2), daysInMonth];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img"
      aria-label="Cumulative burn-down versus workday glidepath and projection">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* y gridlines + labels */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={yFor(t.c)} x2={W - padR} y2={yFor(t.c)}
            stroke="var(--line)" strokeWidth="1" opacity={i === 4 ? .8 : .4} />
          <text x={padL} y={yFor(t.c) - 4} fill="var(--dim)" fontSize="9.5"
            fontFamily="JetBrains Mono">{t.label}</text>
        </g>
      ))}
      {/* x ticks */}
      {xTicks.map((d, i) => (
        <text key={i} x={xFor(d)} y={H - 10} fill="var(--dim)" fontSize="9.5" fontFamily="JetBrains Mono"
          textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}>D{d}</text>
      ))}
      {/* ideal workday glidepath (dashed staircase) */}
      <path d={ideal} fill="none" stroke="var(--steel)" strokeWidth="2"
        strokeDasharray="6 5" opacity=".75" strokeLinejoin="round" />
      {/* today marker */}
      <line x1={todayX} y1={yTop} x2={todayX} y2={yBot}
        stroke="var(--line-bright)" strokeWidth="1" strokeDasharray="2 4" />
      {/* area + actual */}
      <path d={area} fill="url(#areaFill)" />
      <path d={actual} fill="none" stroke="var(--accent)" strokeWidth="2.6"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* projection (dotted) */}
      {today < daysInMonth &&
        <line x1={todayX} y1={todayY} x2={xFor(daysInMonth)} y2={projY}
          stroke="var(--accent)" strokeWidth="2" strokeDasharray="2 5" opacity=".7" strokeLinecap="round" />}
      {/* today dot */}
      <circle cx={todayX} cy={todayY} r="6.5" fill="var(--accent)" opacity=".28" />
      <circle cx={todayX} cy={todayY} r="4" fill="var(--accent)" stroke="#0B0F16" strokeWidth="1.5" />
    </svg>
  );
}

/* ============================ STAT CARD ============================ */
function Stat({ label, value, small, note, tone }) {
  return (
    <div className="card stat col-3">
      <div className="card-label">{label}</div>
      <div className="num">{value}{small && <span className="small"> {small}</span>}</div>
      {note && <div className={"note " + (tone || "")}>{note}</div>}
    </div>
  );
}

/* ============================ ICONS ============================ */
const Ic = {
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 13 4 4L19 7" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 9v4m0 4h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M9 9h6v6H9z" /></svg>,
  chev: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="16" height="16"><path d="m9 6 6 6-6 6" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>,
};

/* ============================ APP ============================ */
function App() {
  const cycle = useMemo(() => getCycle(), []);
  const [entries, setEntries] = useState(() => {
    const s = readStore();
    if (!s) return seedMock(cycle);            // first ever load -> mock usage
    if (s.month !== cycle.monthKey) return []; // new month -> fresh cycle
    return s.entries || [];
  });
  const [raw, setRaw] = useState("");
  const [histOpen, setHistOpen] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");

  // persist (silently no-ops if storage is blocked)
  useEffect(() => { writeStore({ month: cycle.monthKey, entries }); }, [entries, cycle.monthKey]);

  // service worker for offline support and update notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                if (confirm('New version available! Would you like to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(error => console.log('Service worker registration failed:', error));
    }
  }, []);

  /* -------- derived metrics (working-day pacing) -------- */
  const totalUsed = useMemo(() => entries.reduce((a, e) => a + e.amount, 0), [entries]);
  const remaining = Math.max(0, BUDGET - totalUsed);
  const depleted = remaining <= 0;

  // dailyTarget = remainingBudget / remaining WORKDAYS (today counts if Mon–Fri)
  const dailyTarget = remaining / Math.max(1, cycle.wdRemaining);

  const todayUsed = useMemo(() => {
    const e = entries.find(x => x.date === cycle.todayKey);
    return e ? e.amount : 0;
  }, [entries, cycle.todayKey]);

  // traffic light: today's usage vs today's target
  const status = useMemo(() => {
    if (depleted) return STATUS.red;
    const ratio = todayUsed / dailyTarget;
    if (ratio <= 0.9) return STATUS.green;
    if (ratio <= 1.1) return STATUS.yellow;
    return STATUS.red;
  }, [depleted, dailyTarget, todayUsed]);

  // the signature: status drives --accent on the root, recoloring everything
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", status.accent);
    r.setProperty("--accent-2", status.a2);
    r.setProperty("--glow", status.glow);
    r.setProperty("--glow-soft", status.soft);
    r.setProperty("--accent-ink", status.ink);
  }, [status]);

  const monthlyPct = (totalUsed / BUDGET) * 100;
  // where usage SHOULD be today: share of the month's workdays already elapsed
  const idealPct = (cycle.wdElapsed / Math.max(1, cycle.wdTotal)) * 100;

  // velocity per WORKDAY -> projected end-of-month total
  const avgPerWorkday = totalUsed / Math.max(1, cycle.wdElapsed);
  const projTotal = Math.round(avgPerWorkday * cycle.wdTotal);
  const projDelta = projTotal - BUDGET;

  // cumulative actual series for chart (index 0..daysInMonth)
  const cumulative = useMemo(() => {
    const byDay = {};
    entries.forEach(e => { byDay[dayNum(e.date)] = (byDay[dayNum(e.date)] || 0) + e.amount; });
    const arr = [0]; let run = 0;
    for (let d = 1; d <= cycle.daysInMonth; d++) { run += (byDay[d] || 0); arr[d] = run; }
    return arr;
  }, [entries, cycle.daysInMonth]);

  // cumulative IDEAL series: rises only on workdays (flat weekends)
  const idealCum = useMemo(() =>
    cycle.wdThrough.map(w => BUDGET * w / Math.max(1, cycle.wdTotal)),
    [cycle.wdThrough, cycle.wdTotal]);

  // history rows (newest first), pace vs per-workday ideal; weekends tagged
  const idealDaily = BUDGET / Math.max(1, cycle.wdTotal);
  const rows = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date)).map(e => {
      const lab = labelFor(e.date);
      return {
        ...e, ...lab, isToday: e.date === cycle.todayKey,
        pct: (e.amount / BUDGET) * 100,
        over: e.amount > idealDaily * 1.1,
      };
    });
  }, [entries, cycle.todayKey, idealDaily]);
  const maxDay = Math.max(idealDaily * 1.4, ...entries.map(e => e.amount), 1);

  /* -------- actions -------- */
  const parsed = parseInput(raw);
  const canAdd = parsed.ok && parsed.credits > 0;

  // accumulates into today's total — no manual adding-up needed
  const addEntry = useCallback(() => {
    const p = parseInput(raw);
    if (!p.ok || p.credits <= 0) return;
    setEntries(prev => {
      const i = prev.findIndex(e => e.date === cycle.todayKey);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], amount: next[i].amount + p.credits };
        return next;
      }
      return [...prev, { id: "e" + Date.now(), date: cycle.todayKey, amount: p.credits }];
    });
    setRaw("");
  }, [raw, cycle.todayKey]);

  const delEntry = (id) => setEntries(prev => prev.filter(e => e.id !== id));
  const startEdit = (e) => { setEditId(e.id); setEditVal(String(e.amount)); };
  const saveEdit = (id) => {
    const v = parseInt(String(editVal).replace(/[,\s]/g, ""), 10);
    if (!isNaN(v) && v >= 0) setEntries(prev => prev.map(e => e.id === id ? { ...e, amount: v } : e));
    setEditId(null);
  };
  const resetCycle = () => { if (confirm("Clear all logged usage for this cycle?")) setEntries([]); };
  const onKey = (ev) => { if (ev.key === "Enter") addEntry(); };

  /* -------- input live hint -------- */
  let hint = <span>Type credits like <b>1500</b>, or a share of budget like <b>20%</b>. Entries add onto today's total.</span>;
  let hintCls = "";
  if (raw.trim()) {
    if (parsed.ok) {
      hintCls = "ok";
      hint = parsed.kind === "percent"
        ? <span>= <b>{fmt(parsed.credits)}</b> credits &nbsp;·&nbsp; {parsed.raw}% of monthly budget &nbsp;·&nbsp; {fmtMoney(parsed.credits)}</span>
        : <span>= <b>{fmt(parsed.credits)}</b> credits &nbsp;·&nbsp; {(parsed.credits / BUDGET * 100).toFixed(1)}% of budget &nbsp;·&nbsp; {fmtMoney(parsed.credits)}</span>;
    } else { hintCls = "err"; hint = <span>{parsed.error}</span>; }
  }

  const beacon = depleted ? Ic.stop : status.key === "green" ? Ic.check : status.key === "yellow" ? Ic.warn : Ic.stop;

  // today's pace note
  const paceRatio = dailyTarget > 0 ? todayUsed / dailyTarget : 0;
  const paceNote = depleted ? "Budget depleted" :
    !cycle.todayIsWorkday ? "Weekend — off-budget day" :
      paceRatio <= 0.9 ? `${Math.round(paceRatio * 100)}% of today's target` :
        paceRatio <= 1.1 ? "Near today's target" : `${Math.round(paceRatio * 100)}% — over target`;
  const paceTone = depleted || paceRatio > 1.1 ? "bad" : paceRatio > 0.9 ? "warn" : "good";

  return (
    <>
      <style>{CSS}</style>
      <div className="wrap" data-status={status.key}>
        {/* HEADER */}
        <header className="deck-head">
          <div className="brand">
            <div className="sigil" style={{ color: "var(--accent)" }}>{Ic.bolt}</div>
            <div className="brand-txt">
              <h1>Credit Runway</h1>
              <div className="sub">AI BURN TRACKER · <b>{fmt(BUDGET)}</b> credits / <b>${DOLLARS}</b> per cycle</div>
            </div>
          </div>
          <div className="head-right">
            <div className="cycle-chip">
              <span className="pulse-dot"></span>
              {cycle.monthName} · <b>{cycle.wdRemaining}</b> workdays left
            </div>
            <div className="status-pill">{depleted ? "DEPLETED" : status.label}</div>
          </div>
        </header>

        <div className="grid">
          {/* HERO GAUGE */}
          <section className="card lift col-hero gauge-wrap">
            <div className="card-label" style={{ alignSelf: "flex-start" }}>Monthly Reserve · Burn vs Ideal</div>
            <div className="gauge-stage">
              <Gauge monthlyPct={monthlyPct} idealPct={idealPct} />
              <div className="gauge-readout">
                <div className="gauge-pct">{Math.round(monthlyPct)}<span className="unit">%</span></div>
                <div className="gauge-sub"><b>{fmt(totalUsed)}</b> / {fmt(BUDGET)} burned · {fmtMoney(totalUsed)}</div>
              </div>
            </div>
            <div className="gauge-legend">
              <span><i className="lg-actual"></i> Consumed</span>
              <span><i className="lg-ideal"></i> Ideal today ({Math.round(idealPct)}% · workday pace)</span>
            </div>
          </section>

          {/* BURN-DOWN CHART */}
          <section className="card col-chart chart-card">
            <div className="card-label">Cumulative Burn-Down · Workday Glidepath</div>
            <div className="chart-legend" style={{ marginTop: "12px" }}>
              <span><i className="ck actual"></i> Actual</span>
              <span><i className="ck ideal"></i> Ideal pace (flat on weekends)</span>
              <span><i className="ck proj"></i> Projected ({fmt(projTotal)})</span>
            </div>
            <BurnChart cumulative={cumulative} idealCum={idealCum} today={cycle.dom}
              daysInMonth={cycle.daysInMonth} projTotal={projTotal} />
          </section>

          {/* STATS */}
          <Stat label="Credits Remaining"
            value={<span className="accent-num">{fmt(remaining)}</span>}
            small={fmtMoney(remaining)}
            note={`${Math.round(remaining / BUDGET * 100)}% of budget left`} />
          <Stat label="Workdays Left"
            value={cycle.wdRemaining}
            small={`of ${cycle.wdTotal}`}
            note={`≈ ${fmt(dailyTarget)} credits / workday target`} />
          <Stat label="Projected End-of-Month"
            value={fmt(projTotal)}
            small={fmtMoney(projTotal)}
            note={depleted ? "Budget already spent" :
              projDelta > 0 ? `${fmt(projDelta)} over budget at this pace` :
                `${fmt(-projDelta)} under — room to spare`}
            tone={projDelta > 0 ? "bad" : "good"} />
          <Stat label="Today's Usage"
            value={fmt(todayUsed)}
            small={`/ ${fmt(dailyTarget)} target`}
            note={paceNote} tone={paceTone} />

          {/* STATUS BANNER */}
          <div className="banner" data-status={status.key}>
            <div className="beacon">{beacon}</div>
            <div className="banner-txt">
              <strong>{depleted ? "Budget depleted" : status.label}</strong>
              <span>{depleted
                ? "No credits remain this cycle. Usage now risks overshooting your $400 cap before reset."
                : status.msg}</span>
            </div>
          </div>

          {/* INPUT */}
          <section className="card lift col-12">
            <div className="card-label">Log Usage</div>
            <div className="input-row">
              <div className="field">
                <span className="caret">›</span>
                <input value={raw} onChange={e => setRaw(e.target.value)} onKeyDown={onKey}
                  placeholder="1500   or   20%" inputMode="text"
                  aria-label="Credits or percentage used" />
              </div>
              <button className="btn" onClick={addEntry} disabled={!canAdd}>Add Entry</button>
            </div>
            <div className={"field-hint " + hintCls} aria-live="polite">{hint}</div>
            <div className="quick">
              {["5%", "10%", "1000", "2500"].map(q => (
                <button key={q} className="chip-btn" onClick={() => setRaw(q)}>+ {q}</button>
              ))}
            </div>
          </section>

          {/* HISTORY */}
          <section className="card col-12">
            <button className="hist-head" onClick={() => setHistOpen(o => !o)}
              aria-expanded={histOpen}>
              <span className="card-label" style={{ marginBottom: 0 }}>Daily Log · {cycle.monthName}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span className="meta">{entries.length} {entries.length === 1 ? "day" : "days"} · {fmt(totalUsed)} credits</span>
                <span className={"chev " + (histOpen ? "open" : "")}>{Ic.chev}</span>
              </span>
            </button>

            {histOpen && (
              rows.length === 0 ? (
                <div className="empty-row">No usage logged yet this cycle. Add your first entry above to start tracking.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="r">Credits</th>
                      <th className="r hide-sm">% Budget</th>
                      <th className="hide-sm">Vs workday pace</th>
                      <th className="r">Pace</th>
                      <th className="r">·</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div className="day-tag">
                            <span className={r.isToday ? "row-today" : ""}>{r.short}{r.isToday ? " · today" : ""}</span>
                            <span className="dow">{r.dow}</span>
                          </div>
                        </td>
                        <td className="r">
                          {editId === r.id ? (
                            <input className="edit-input" value={editVal} autoFocus
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(r.id); if (e.key === "Escape") setEditId(null); }} />
                          ) : <b style={{ color: "var(--text)" }}>{fmt(r.amount)}</b>}
                        </td>
                        <td className="r hide-sm" style={{ color: "var(--muted)" }}>{r.pct.toFixed(1)}%</td>
                        <td className="hide-sm">
                          <div className="mini-bar"><i style={{ width: Math.min(100, (r.amount / maxDay) * 100) + "%" }}></i></div>
                        </td>
                        <td className="r">
                          <span className={"pace-tag " + (r.isWeekend ? "wknd" : r.over ? "over" : "under")}>
                            {r.isWeekend ? "wknd" : r.over ? "over" : "on"}
                          </span>
                        </td>
                        <td className="r">
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            {editId === r.id ? (
                              <button className="icon-btn" onClick={() => saveEdit(r.id)} title="Save" aria-label="Save entry">{Ic.check}</button>
                            ) : (
                              <button className="icon-btn" onClick={() => startEdit(r)} title="Edit" aria-label="Edit entry">{Ic.edit}</button>
                            )}
                            <button className="icon-btn danger" onClick={() => delEntry(r.id)} title="Delete" aria-label="Delete entry">{Ic.trash}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
            {rows.length > 0 && histOpen &&
              <div style={{ marginTop: "14px", textAlign: "right" }}>
                <button className="ghost-link" onClick={resetCycle}>Reset cycle</button>
              </div>}
          </section>
        </div>

        <footer className="deck-foot">
          Auto-resets on the 1st · budget paced over <b>Mon–Fri only</b> · data stored locally in your browser · <b>100 credits = $1</b>
        </footer>
      </div>
    </>
  );
}

export default App;