import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MapBounds, MapListing } from '../../models/interfaces';

@Component({
  selector: 'app-listings-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './listings-map.component.html',
  styleUrl: './listings-map.component.css',
})
export class ListingsMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() listings: MapListing[] = [];
  @Input() center: [number, number] = [43.238949, 76.889709];
  @Input() zoom = 11;
  @Output() boundsChanged = new EventEmitter<MapBounds>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);
  private router = inject(Router);

  private map: any;
  private cluster: any;
  private L: any;
  private boundsDebounce?: any;
  private resizeObserver?: ResizeObserver;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const leaflet = await import('leaflet');
      await import('leaflet.markercluster');
      this.L = (leaflet as any).default ?? leaflet;
      this.zone.runOutsideAngular(() => this.initMap());
    } catch (e) {
      console.warn('[ListingsMap] Leaflet load failed', e);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listings'] && this.map) {
      this.renderMarkers();
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (this.boundsDebounce) clearTimeout(this.boundsDebounce);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const L = this.L;
    this.map = L.map(this.mapEl.nativeElement, {
      center: this.center,
      zoom: this.zoom,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer(
      'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=22.04.08-0-b220316214930&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
      {
        attribution: '© Яндекс',
        subdomains: ['01', '02', '03', '04'],
        maxZoom: 19,
      },
    ).addTo(this.map);

    this.cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 40 : count < 100 ? 48 : 56;
        return L.divIcon({
          html: `<div class="cluster-inner"><span>${count}</span></div>`,
          className: 'shanyrak-cluster',
          iconSize: L.point(size, size),
        });
      },
    });
    this.map.addLayer(this.cluster);

    this.map.on('moveend', () => this.emitBoundsDebounced());

    this.renderMarkers();

    const invalidate = () => this.map && this.map.invalidateSize();
    setTimeout(invalidate, 0);
    setTimeout(invalidate, 120);
    setTimeout(() => {
      invalidate();
      this.emitBoundsDebounced(0);
    }, 300);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => invalidate());
      this.resizeObserver.observe(this.mapEl.nativeElement);
    }
  }

  private emitBoundsDebounced(delay = 300): void {
    if (this.boundsDebounce) clearTimeout(this.boundsDebounce);
    this.boundsDebounce = setTimeout(() => {
      const b = this.map.getBounds();
      this.zone.run(() => {
        this.boundsChanged.emit({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        });
      });
    }, delay);
  }

  private renderMarkers(): void {
    if (!this.cluster || !this.L) return;
    const L = this.L;
    this.cluster.clearLayers();

    for (const l of this.listings) {
      if (l.latitude == null || l.longitude == null) continue;
      const priceLabel = this.formatShortPrice(l.price, l.listing_type);
      const marker = L.marker([l.latitude, l.longitude], {
        icon: L.divIcon({
          className: 'shanyrak-pin',
          html: `<div class="pin-price">${priceLabel}</div>`,
          iconSize: L.point(70, 28),
          iconAnchor: L.point(35, 28),
        }),
      });

      marker.bindPopup(this.buildPopup(l), {
        offset: L.point(0, -24),
        closeButton: false,
        className: 'shanyrak-popup',
        minWidth: 240,
      });

      marker.on('popupopen', (e: any) => {
        const el = e.popup.getElement();
        if (!el) return;
        const link = el.querySelector('[data-listing-id]');
        if (link) {
          link.addEventListener('click', (ev: Event) => {
            ev.preventDefault();
            this.zone.run(() =>
              this.router.navigate(['/listing', (link as HTMLElement).dataset['listingId']]),
            );
          });
        }
      });

      this.cluster.addLayer(marker);
    }
  }

  private buildPopup(l: MapListing): string {
    const img = l.main_image
      ? `<div class="pop-img" style="background-image:url('${l.main_image}')"></div>`
      : `<div class="pop-img placeholder"></div>`;
    const typeLabel = l.listing_type === 'rent' ? 'Аренда' : 'Продажа';
    const price = this.formatFullPrice(l.price, l.listing_type);
    return `
      <div class="pop-card" data-listing-id="${l.id}">
        ${img}
        <div class="pop-body">
          <div class="pop-badge">${typeLabel}</div>
          <div class="pop-price">${price}</div>
          <div class="pop-title">${this.escapeHtml(l.title)}</div>
          <div class="pop-meta">${l.rooms}-комн · ${l.area} м²</div>
          <div class="pop-addr">${this.escapeHtml(l.city)}, ${this.escapeHtml(l.address)}</div>
        </div>
      </div>`;
  }

  private formatShortPrice(price: number, type: 'rent' | 'sale'): string {
    if (type === 'rent') {
      return price >= 1000 ? `${Math.round(price / 1000)}к/мес` : `${price}/мес`;
    }
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} млн`;
    if (price >= 1000) return `${Math.round(price / 1000)}к`;
    return String(price);
  }

  private formatFullPrice(price: number, type: 'rent' | 'sale'): string {
    const formatted = price.toLocaleString('ru-RU');
    return type === 'rent' ? `${formatted} ₸/мес` : `${formatted} ₸`;
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c] as string);
  }
}
