import { Injectable, computed, effect, signal } from '@angular/core';
import { Customer, DEF, Item, Order, Plan, Route, SHOP, Settings } from './models';
import { rng } from './optimizer';

const load = <T>(k: string, d: T): T => { try { const v = localStorage.getItem('rd.' + k); return v ? JSON.parse(v) : d; } catch { return d; } };
const NAMES = ['สมชาย ใจดี', 'วิภา สุขสันต์', 'ธนากร แสนดี', 'พิมพ์ชนก รัตนโชติ', 'กิตติพงษ์ ศรีสุข', 'ณัฐธิดา บุญมา', 'อนุชา พลเมือง', 'สุภาพร ทองดี', 'ปรีชา วงศ์ใหญ่', 'รัชนี คำแก้ว', 'วรเดช อินทร์แก้ว', 'จิราพร สีดา', 'สมศักดิ์ ภูมิพัฒน์', 'ชลิตา แก้วมณี', 'เอกชัย ศรีวงศ์', 'มณีรัตน์ ดวงจันทร์', 'ภาณุพงศ์ ไชยา', 'อัญชลี พรหมมา', 'นิพนธ์ สุริยะ', 'ศิริพร คำภา', 'ธีรพงษ์ มูลสาร', 'กนกวรรณ ปัดภัย', 'พงษ์ศักดิ์ ทิพย์รส', 'ลลิตา เพชรดี', 'สุรชัย บุตรดี', 'เบญจมาศ โสภา', 'ยุทธนา ราชา', 'ปวีณา ศรีสวัสดิ์', 'อดิศักดิ์ กุลวงศ์', 'ขวัญใจ ทองสุข'];
const PLACES = ['หอพักสุขสบาย', 'อาคารเรียน มมส.', 'หอพักบ้านสวน', 'อพาร์ตเมนต์ริมกุด', 'สำนักงานเทศบาล', 'คลินิกทันตกรรม', 'ร้านถ่ายเอกสาร', 'หอพักนักศึกษาหญิง', 'บริษัทประกันภัย', 'โรงเรียนอนุบาล'];

function seedCustomers(): Customer[] {
  const r = rng(7), c = Math.cos(SHOP.lat * Math.PI / 180);
  return NAMES.map((name, i) => { const d = 2.9 * Math.sqrt(r()), a = r() * 6.283;
    return { id: i + 1, name, phone: '08' + String(10000000 + (r() * 89999999 | 0)), address: `${PLACES[i % PLACES.length]} ซ.${1 + i % 12} อ.เมือง จ.มหาสารคาม`,
      lat: +(SHOP.lat + d * Math.cos(a) / 111).toFixed(5), lng: +(SHOP.lng + d * Math.sin(a) / (111 * c)).toFixed(5) }; });
}

/** ชั้นข้อมูลทั้งหมดอยู่ที่นี่ที่เดียว (เก็บใน localStorage) — ถ้าต่อ Back end ให้เปลี่ยนเมธอดเหล่านี้เป็น HttpClient */
@Injectable({ providedIn: 'root' })
export class Store {
  customers = signal<Customer[]>(load('customers', seedCustomers()));
  orders = signal<Order[]>(load<Order[] | null>('orders', null) ?? this.customers().slice(0, 25).map((c, i) => ({ id: i + 1, customerId: c.id, boxes: 1 + (i * 7 + 2) % 3 })));
  settings = signal<Settings>({ ...DEF, ...load('settings', {}) });
  plan = signal<Plan | null>(load('plan', null));
  items = computed<Item[]>(() => this.orders().flatMap(o => { const c = this.customers().find(x => x.id === o.customerId); return c ? [{ id: o.id, lat: c.lat, lng: c.lng, boxes: o.boxes, name: c.name, phone: c.phone, address: c.address }] : []; }));

  constructor() { (['customers', 'orders', 'settings', 'plan'] as const).forEach(k => effect(() => { try { localStorage.setItem('rd.' + k, JSON.stringify(this[k]())); } catch { /* เต็มหรือถูกปิด */ } })); }

  private nid = (a: { id: number }[]) => Math.max(0, ...a.map(x => x.id)) + 1;
  saveCustomer(c: Customer) { this.customers.update(l => c.id ? l.map(x => x.id === c.id ? c : x) : [...l, { ...c, id: this.nid(l) }]); }
  delCustomer(id: number) { this.customers.update(l => l.filter(x => x.id !== id)); this.orders.update(l => l.filter(o => o.customerId !== id)); }
  addOrder(customerId: number, boxes: number) { this.orders.update(l => [...l, { id: this.nid(l), customerId, boxes }]); }
  setBoxes(id: number, boxes: number) { this.orders.update(l => l.map(o => o.id === id ? { ...o, boxes: Math.min(3, Math.max(1, boxes)) } : o)); }
  delOrder(id: number) { this.orders.update(l => l.filter(o => o.id !== id)); }
  simulate(n: number) {
    const ids = this.customers().map(c => c.id).sort(() => Math.random() - .5).slice(0, n);
    this.orders.set(ids.map((customerId, i) => ({ id: i + 1, customerId, boxes: 1 + Math.floor(Math.random() * 3) })));
  }
  confirm(routes: Route[], sig: string) {
    const used = new Set<string>();
    this.plan.set({ sig, depart: this.settings().depart, routes: routes.map(r => { let c = ''; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (used.has(c)); used.add(c); return { ...r, code: c }; }) });
  }
  toggleDone(code: string, i: number) { this.plan.update(p => p && { ...p, routes: p.routes.map(r => r.code === code ? { ...r, stops: r.stops.map((s, k) => k === i ? { ...s, done: !s.done } : s) } : r) }); }
}
