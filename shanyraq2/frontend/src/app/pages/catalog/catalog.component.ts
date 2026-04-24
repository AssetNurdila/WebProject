import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, switchMap, catchError, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';
import { ListingsMapComponent } from '../../components/listings-map/listings-map.component';
import { ListingsService } from '../../services/listings.service';
import { Listing, ListingFilters, MapBounds, MapListing } from '../../models/interfaces';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [FormsModule, ListingCardComponent, ListingsMapComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
  host: { ngSkipHydration: 'true' },
})
export class CatalogComponent implements OnInit {
  private listingsService = inject(ListingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  listings: Listing[] = [];
  isLoading = true;
  errorMessage = '';
  skeletons = [1, 2, 3, 4, 5, 6];

  filters: ListingFilters = {
    city: '',
    listing_type: '',
    min_price: null,
    max_price: null,
    rooms: null,
    min_rooms: null,
  };

  sortBy = 'date';

  viewMode: 'list' | 'map' = 'list';
  mapListings: MapListing[] = [];
  mapBounds: MapBounds | null = null;

  private filterChange$ = new Subject<void>();

  ngOnInit(): void {
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params) => {
      if (params['city']) this.filters.city = params['city'];
      if (params['listing_type']) this.filters.listing_type = params['listing_type'];
      if (params['view'] === 'map') this.viewMode = 'map';
      this.filterChange$.next();
    });

    this.filterChange$.pipe(
      debounceTime(400),
      switchMap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        const cleanFilters = this.cleanFilters();
        return this.listingsService.getAll(cleanFilters).pipe(
          catchError(() => {
            this.errorMessage = 'Ошибка загрузки объявлений';
            return of({ count: 0, next: null, previous: null, results: [] });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((response) => {
      this.listings = this.sortListings(response.results);
      this.isLoading = false;
    });
  }

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode = mode;
    if (mode === 'map') this.loadMapListings();
  }

  onFilterChange(): void {
    this.filterChange$.next();
    if (this.viewMode === 'map') this.loadMapListings();
  }

  onMapBoundsChanged(bounds: MapBounds): void {
    this.mapBounds = bounds;
    this.loadMapListings();
  }

  private loadMapListings(): void {
    const cleanFilters = this.cleanFilters();
    this.listingsService.getMapListings(cleanFilters, this.mapBounds ?? undefined).subscribe({
      next: (data) => (this.mapListings = data),
      error: () => (this.mapListings = []),
    });
  }

  private cleanFilters(): ListingFilters {
    const f: ListingFilters = {};
    if (this.filters.city) f.city = this.filters.city;
    if (this.filters.listing_type) f.listing_type = this.filters.listing_type;
    if (this.filters.min_price != null) f.min_price = this.filters.min_price;
    if (this.filters.max_price != null) f.max_price = this.filters.max_price;
    if (this.filters.rooms != null) f.rooms = this.filters.rooms;
    if (this.filters.min_rooms != null) f.min_rooms = this.filters.min_rooms;
    return f;
  }

  loadListings(): void {
    this.filterChange$.next();
  }

  sortListings(data: Listing[]): Listing[] {
    if (this.sortBy === 'price_asc') return [...data].sort((a, b) => a.price - b.price);
    if (this.sortBy === 'price_desc') return [...data].sort((a, b) => b.price - a.price);
    return [...data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  applyFilters(): void {
    this.filterChange$.next();
    if (this.viewMode === 'map') this.loadMapListings();
  }

  resetFilters(): void {
    this.filters = { city: '', listing_type: '', min_price: null, max_price: null, rooms: null, min_rooms: null };
    this.sortBy = 'date';
    this.filterChange$.next();
    if (this.viewMode === 'map') this.loadMapListings();
  }

  onSortChange(): void {
    this.listings = this.sortListings(this.listings);
  }
}
