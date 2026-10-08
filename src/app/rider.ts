import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LIMIT, SHOP, Stop } from './models';
import { Store } from './store.service';
import { clock } from './util';

@Component({
  imports: [FormsModule],
  template: ` <div class="rp">
    <header class="rtop">
      <b>ข้าวกล่องเดลิเวอรี่</b><span>ใบงานไรเดอร์</span>
    </header>
    @if (!job()) {
      <form class="card login" (submit)="go(); $event.preventDefault()">
        <h1>กรอกเลขใบงาน</h1>
        <p class="sub">
          ขอรหัส 4 หลักจากร้าน แล้วกรอกที่นี่เพื่อดูเส้นทางส่งของวันนี้
        </p>
        <input
          class="code-in"
          inputmode="numeric"
          maxlength="4"
          placeholder="เช่น 4821"
          [(ngModel)]="typed"
          name="code"
          autofocus
        />
        @if (code() && !job()) {
          <p class="err">
            ไม่พบใบงานรหัส {{ code() }} ตรวจสอบรหัสกับร้านอีกครั้ง
            หรือให้ร้านกดยืนยันเส้นทางก่อน
          </p>
        }
        <button class="btn go big block">ดูใบงาน</button>
      </form>
    } @else {
      <h1>ไรเดอร์ {{ job()!.rider }}</h1>
      <p class="lead">
        วันนี้ต้องหยิบข้าวกล่อง <b>{{ job()!.boxes }} กล่อง</b> ไปส่ง
        {{ job()!.stops.length }} จุด ให้ถึงก่อน {{ t(LIMIT) }}
      </p>
      <a class="btn go big block" [href]="all()" target="_blank" rel="noopener"
        >เปิดเส้นทางทั้งหมดใน Google Maps</a
      >
      <p class="prog">
        ส่งแล้ว {{ finished() }} จาก {{ job()!.stops.length }} จุด
      </p>
      <ol class="jobs">
        @for (p of job()!.stops; track p.id; let i = $index) {
          <li [class.done]="p.done">
            <div class="jn">จุดที่ {{ i + 1 }}</div>
            <div class="jb">
              <b>บ้านคุณ {{ p.name }}</b>
              <p>{{ p.address }}</p>
              <p>
                {{ p.boxes }} กล่อง ถึงประมาณ {{ t(p.at) }} ({{
                  p.km.toFixed(1)
                }}
                กม. จากจุดก่อนหน้า)
              </p>
            </div>
            <div class="ja">
              <a class="btn" [href]="nav(p)" target="_blank" rel="noopener"
                >นำทาง</a
              >
              <a class="btn ghost" [href]="'tel:' + p.phone">โทร</a>
              <button class="btn ghost" (click)="s.toggleDone(job()!.code, i)">
                {{ p.done ? 'ยกเลิกส่งแล้ว' : 'ส่งแล้ว' }}
              </button>
            </div>
          </li>
        }
      </ol>
    }
  </div>`,
})
export class RiderPage {
  s = inject(Store);
  router = inject(Router);
  LIMIT = LIMIT;
  code = signal(inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '');
  typed = this.code();
  job = computed(() =>
    this.s.plan()?.routes.find((r) => r.code === this.code()),
  );
  finished = computed(
    () => this.job()?.stops.filter((p) => p.done).length ?? 0,
  );
  t = (m: number) => clock(this.s.plan()?.depart ?? '11:30', m);
  go() {
    const c = this.typed.trim();
    if (c) this.router.navigate(['/rider', c]);
  }
  nav = (p: Stop) =>
    `https://www.google.com/maps/dir/?api=1&origin=${SHOP.lat},${SHOP.lng}&destination=${p.lat},${p.lng}&travelmode=two-wheeler`;
  all() {
    const st = this.job()!.stops,
      l = st[st.length - 1];
    return (
      `https://www.google.com/maps/dir/?api=1&origin=${SHOP.lat},${SHOP.lng}&destination=${l.lat},${l.lng}&travelmode=two-wheeler` +
      (st.length > 1
        ? '&waypoints=' +
          st
            .slice(0, -1)
            .map((p) => p.lat + ',' + p.lng)
            .join('%7C')
        : '')
    );
  }
}
