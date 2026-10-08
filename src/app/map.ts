import { AfterViewInit, Component, ElementRef, OnDestroy, effect, input, output, viewChild } from '@angular/core';
import * as L from 'leaflet';
import { SHOP } from './models';

export interface MapPin { lat: number; lng: number; text: string; color: string; tip?: string; on?: boolean; small?: boolean }
export interface MapLine { color: string; pts: [number, number][]; on?: boolean }

@Component({ selector: 'app-map', template: '<div #el></div>', styles: [':host{display:block;height:100%}div{height:100%;border-radius:inherit}'] })
export class MapView implements AfterViewInit, OnDestroy {
  pins = input<MapPin[]>([]); lines = input<MapLine[]>([]); fit = input(true); pick = output<{ lat: number; lng: number }>();
  el = viewChild.required<ElementRef<HTMLDivElement>>('el');
  private map?: L.Map; private layer = L.layerGroup(); private ro?: ResizeObserver;
  constructor() { effect(() => { const p = this.pins(), l = this.lines(), f = this.fit(); if (this.map) this.draw(p, l, f); }); }

  ngAfterViewInit() {
    const m = this.map = L.map(this.el().nativeElement).setView([SHOP.lat, SHOP.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    this.layer.addTo(m); m.on('click', e => this.pick.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));
    this.ro = new ResizeObserver(() => m.invalidateSize()); this.ro.observe(this.el().nativeElement);
    this.draw(this.pins(), this.lines(), this.fit());
  }
  ngOnDestroy() { this.ro?.disconnect(); this.map?.remove(); }

  private draw(pins: MapPin[], lines: MapLine[], fit: boolean) {
    this.layer.clearLayers(); const b: L.LatLngTuple[] = [[SHOP.lat, SHOP.lng]];
    const icon = (html: string, s: number) => L.divIcon({ className: '', html, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
    lines.forEach(l => L.polyline(l.pts, { color: l.color, weight: l.on === false ? 3 : 5, opacity: l.on === false ? .25 : .9 }).addTo(this.layer));
    pins.forEach(p => {
      b.push([p.lat, p.lng]);
      const m = L.marker([p.lat, p.lng], { icon: icon(`<div class="pin${p.small ? ' sm' : ''}${p.on === false ? ' dim' : ''}" style="--c:${p.color}">${p.text}</div>`, p.small ? 14 : 26) }).addTo(this.layer);
      if (p.tip) { const t = document.createElement('span'); t.textContent = p.tip; m.bindTooltip(t); }
    });
    L.marker([SHOP.lat, SHOP.lng], { icon: icon('<div class="pin shop">ร้าน</div>', 40), zIndexOffset: 1000 }).bindTooltip(SHOP.name).addTo(this.layer);
    if (fit) this.map!.fitBounds(b, { padding: [32, 32], maxZoom: 16 });
  }
}
