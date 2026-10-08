import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
<div class="shell">
  <aside>
    <div class="brand"><b>ข้าวกล่อง<br>เดลิเวอรี่</b><span>ศูนย์จัดส่งช่วงเที่ยง</span></div>
    <nav>
      <a routerLink="/customers" routerLinkActive="on">ลูกค้า</a>
      <a routerLink="/orders" routerLinkActive="on">ออเดอร์</a>
      <a routerLink="/dispatch" routerLinkActive="on">จัดเส้นทางส่ง</a>
    </nav>
    <a class="rlink" routerLink="/rider" target="_blank">เปิดหน้าสำหรับไรเดอร์</a>
  </aside>
  <main><router-outlet /></main>
</div>`,
})
export class Layout {}
