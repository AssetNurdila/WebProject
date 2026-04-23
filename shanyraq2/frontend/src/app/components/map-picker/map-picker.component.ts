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
import { FormsModule } from '@angular/forms';

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface Suggestion {
  label: string;
  latitude: number;
  longitude: number;
}

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-picker.component.html',
  styleUrl: './map-picker.component.css',
})
export class MapPickerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() searchQuery = '';
  @Output() locationChange = new EventEmitter<PickedLocation>();

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);

  private map: any;
  private marker: any;
  private L: any;
  private resizeObserver?: ResizeObserver;
  private defaultCenter: [number, number] = [43.238949, 76.889709];

  isSearching = false;
  searchError = '';
  localSearch = '';
  suggestions: Suggestion[] = [];
  showSuggestions = false;
  private suggestDebounce?: any;
  private activeFetchController?: AbortController;

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const leaflet = await import('leaflet');
      this.L = (leaflet as any).default ?? leaflet;
      this.zone.runOutsideAngular(() => this.initMap());
    } catch (e) {
      console.warn('[MapPicker] Leaflet load failed', e);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if ((changes['latitude'] || changes['longitude']) && this.latitude != null && this.longitude != null) {
      this.setMarker(this.latitude, this.longitude, false);
    }
    if (changes['searchQuery'] && this.searchQuery && this.searchQuery.trim()) {
      this.localSearch = this.searchQuery;
    }
  }

  ngOnDestroy(): void {
    if (this.suggestDebounce) clearTimeout(this.suggestDebounce);
    if (this.activeFetchController) this.activeFetchController.abort();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    const L = this.L;
    const start: [number, number] =
      this.latitude != null && this.longitude != null
        ? [this.latitude, this.longitude]
        : this.defaultCenter;

    this.map = L.map(this.mapEl.nativeElement, {
      center: start,
      zoom: this.latitude != null ? 15 : 11,
      zoomControl: true,
    });

    L.tileLayer(
      'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=22.04.08-0-b220316214930&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
      {
        attribution: '© Яндекс',
        subdomains: ['01', '02', '03', '04'],
        maxZoom: 19,
      },
    ).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setMarker(e.latlng.lat, e.latlng.lng, true);
    });

    if (this.latitude != null && this.longitude != null) {
      this.setMarker(this.latitude, this.longitude, false);
    }

    const invalidate = () => this.map && this.map.invalidateSize();
    setTimeout(invalidate, 0);
    setTimeout(invalidate, 120);
    setTimeout(invalidate, 300);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => invalidate());
      this.resizeObserver.observe(this.mapEl.nativeElement);
    }
  }

  private setMarker(lat: number, lng: number, emit: boolean): void {
    const L = this.L;
    if (!this.marker) {
      this.marker = L.marker([lat, lng], {
        draggable: true,
        icon: L.divIcon({
          className: 'picker-pin',
          html: '<div class="picker-pin-inner"></div>',
          iconSize: L.point(28, 36),
          iconAnchor: L.point(14, 36),
        }),
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const pos = this.marker.getLatLng();
        this.emitLocation(pos.lat, pos.lng);
      });
    } else {
      this.marker.setLatLng([lat, lng]);
    }
    if (emit) {
      this.emitLocation(lat, lng);
    }
  }

  private emitLocation(lat: number, lng: number): void {
    this.zone.run(() =>
      this.locationChange.emit({
        latitude: +lat.toFixed(6),
        longitude: +lng.toFixed(6),
      }),
    );
  }

  onSearchInput(): void {
    this.searchError = '';
    if (this.suggestDebounce) clearTimeout(this.suggestDebounce);
    const q = this.localSearch.trim();
    if (q.length < 3) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }
    this.suggestDebounce = setTimeout(() => this.fetchSuggestions(q), 300);
  }

  private async fetchSuggestions(q: string): Promise<void> {
    if (this.activeFetchController) this.activeFetchController.abort();
    this.activeFetchController = new AbortController();
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0&countrycodes=kz&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'ru' },
        signal: this.activeFetchController.signal,
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        this.suggestions = data.map((d: any) => ({
          label: d.display_name as string,
          latitude: parseFloat(d.lat),
          longitude: parseFloat(d.lon),
        }));
        this.showSuggestions = this.suggestions.length > 0;
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        this.searchError = 'Ошибка поиска';
      }
    }
  }

  pickSuggestion(s: Suggestion): void {
    this.localSearch = s.label;
    this.suggestions = [];
    this.showSuggestions = false;
    this.map.setView([s.latitude, s.longitude], 16);
    this.setMarker(s.latitude, s.longitude, true);
  }

  hideSuggestions(): void {
    setTimeout(() => (this.showSuggestions = false), 150);
  }

  async searchAddress(): Promise<void> {
    const q = this.localSearch.trim();
    if (!q) return;
    if (this.suggestions.length > 0) {
      this.pickSuggestion(this.suggestions[0]);
      return;
    }
    this.isSearching = true;
    this.searchError = '';
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kz&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'ru' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.map.setView([lat, lng], 16);
        this.setMarker(lat, lng, true);
      } else {
        this.searchError = 'Адрес не найден';
      }
    } catch {
      this.searchError = 'Ошибка поиска';
    } finally {
      this.isSearching = false;
    }
  }

  clearMarker(): void {
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    this.zone.run(() => this.locationChange.emit({ latitude: NaN, longitude: NaN }));
  }
}
