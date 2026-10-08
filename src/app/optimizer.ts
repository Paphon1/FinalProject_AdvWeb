import { BASE, COLORS, Item, LIMIT, MAXO, PER, Pt, Route, SHOP, Settings, Stop, Totals } from './models';

const rad = Math.PI / 180;
/** ระยะทางเส้นตรง (haversine) คูณตัวคูณความคดเคี้ยวของถนน */
export const km = (a: Pt, b: Pt, f = 1) => 12742 * f * Math.asin(Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2));
export const rng = (a: number) => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const perms = <T>(a: T[]): T[][] => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));

interface G { ord: Item[]; km: number; fee: number; at: number[]; score: number }

/** ประเมินกลุ่มส่งของ 1 ไรเดอร์ (≤3 ออเดอร์): ลองทุกลำดับจุด เลือกลำดับที่ต้นทุนต่ำสุด; fixed=true คือใช้ตามลำดับที่ให้มา */
export function evalG(items: Item[], s: Settings, fixed = false): G {
  let best!: G;
  for (const p of fixed ? [items] : perms(items)) {
    let t = 0, d = 0, late = 0, prev: Pt = SHOP; const at: number[] = [];
    for (const o of p) { const k = km(prev, o, s.road); d += k; t += k / s.speed * 60; at.push(t); late += Math.max(0, t - LIMIT); t += s.stopMin; prev = o; }
    if (s.back) d += km(prev, SHOP, s.road);
    const fee = BASE + PER * items.reduce((a, o) => a + o.boxes, 0) * d;
    const g = { ord: p, km: d, fee, at, score: fee + (late ? 2000 + late * 500 : 0) };
    if (!best || g.score < best.score) best = g;
  }
  return best;
}

const key = (g: number[]) => [...g].sort((a, b) => a - b).join('-');

/** Simulated annealing: แบ่งออเดอร์เป็นกลุ่มละไม่เกิน 3 ให้ต้นทุนรวม (ค่าส่ง + โทษส่งเลท) ต่ำสุด */
function solve(items: Item[], s: Settings, seed: number, cache: Map<string, G>): number[][] {
  const r = rng(seed), by = new Map(items.map(i => [i.id, i])), N = 3500;
  const gc = (g: number[]) => { const k = key(g); let v = cache.get(k); if (!v) cache.set(k, v = evalG(g.map(i => by.get(i)!), s)); return v.score; };
  const off = r() * 6.28, ang = new Map(items.map(i => [i.id, (Math.atan2(i.lat - SHOP.lat, i.lng - SHOP.lng) + off + (r() - .5) * .6 + 12.57) % 6.283]));
  const ids = items.map(i => i.id).sort((a, b) => ang.get(a)! - ang.get(b)!);
  let G: number[][] = []; for (let i = 0; i < ids.length; i += MAXO) G.push(ids.slice(i, i + MAXO));
  let cur = G.reduce((a, g) => a + gc(g), 0), bc = cur, best = G.map(g => [...g]);
  for (let n = 0; n < N; n++) {
    const T = 40 * Math.pow(.0005, n / N), a = r() * G.length | 0, ia = r() * G[a].length | 0, b = r() * (G.length + 1) | 0;
    if (a === b) continue;
    const id = G[a][ia]; let na: number[], nb: number[];
    if (b < G.length && (G[b].length >= MAXO || r() < .4)) { const j = r() * G[b].length | 0; nb = [...G[b]]; nb[j] = id; na = [...G[a]]; na[ia] = G[b][j]; }
    else { nb = b < G.length ? [...G[b], id] : [id]; na = G[a].filter((_, k) => k !== ia); }
    const d = (na.length ? gc(na) : 0) + gc(nb) - gc(G[a]) - (b < G.length ? gc(G[b]) : 0);
    if (d < 0 || r() < Math.exp(-d / T)) {
      const H = [...G]; H[a] = na; if (b < G.length) H[b] = nb; else H.push(nb);
      G = H.filter(g => g.length); cur += d;
      if (cur < bc - 1e-9) { bc = cur; best = G.map(g => [...g]); }
    }
  }
  return best;
}

/** รันหลาย seed แล้วคืนคำตอบที่ไม่ซ้ำกัน เรียงจากต้นทุนต่ำสุด */
export function solveMany(items: Item[], s: Settings, base: number, count = 20) {
  const cache = new Map<string, G>(), seen = new Map<string, number[][]>();
  for (let i = 0; i < count; i++) { const g = solve(items, s, base + i * 7919, cache); seen.set(g.map(key).sort().join('|'), g); }
  return [...seen].map(([sig, g]) => ({ sig, g, sc: g.reduce((a, x) => a + cache.get(key(x))!.score, 0) })).sort((a, b) => a.sc - b.sc);
}

/** แปลงกลุ่มเป็นเส้นทางไรเดอร์ (เรียงจุด เวลาถึง ระยะ ค่าส่ง) และเลขไรเดอร์ไล่ตามทิศรอบร้าน */
export function build(groups: number[][], items: Item[], s: Settings, fixed = false): Route[] {
  const m = new Map(items.map(i => [i.id, i])), ang = (r: Route) => Math.atan2(r.stops[0].lat - SHOP.lat, r.stops[0].lng - SHOP.lng);
  return groups.map(g => {
    const e = evalG(g.map(i => m.get(i)!), s, fixed); let prev: Pt = SHOP;
    const stops: Stop[] = e.ord.map((o, i) => { const st = { ...o, km: km(prev, o, s.road), at: e.at[i], done: false }; prev = o; return st; });
    return { rider: 0, code: '', color: '', stops, boxes: stops.reduce((a, x) => a + x.boxes, 0), km: e.km, fee: e.fee, end: e.at[e.at.length - 1] };
  }).sort((a, b) => ang(a) - ang(b)).map((r, i) => ({ ...r, rider: i + 1, color: COLORS[i % COLORS.length] }));
}

export const totals = (rs: Route[]): Totals => {
  const boxes = rs.reduce((a, r) => a + r.boxes, 0), fee = rs.reduce((a, r) => a + r.fee, 0), rev = boxes * 65, food = boxes * 40;
  return { orders: rs.reduce((a, r) => a + r.stops.length, 0), boxes, rev, food, fee, profit: rev - food - fee, km: rs.reduce((a, r) => a + r.km, 0), riders: rs.length,
    late: rs.reduce((a, r) => a + r.stops.filter(p => p.at > LIMIT + 1e-6).length, 0), end: Math.max(0, ...rs.map(r => r.end)) };
};
