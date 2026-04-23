import { Component, inject, OnInit } from '@angular/core';
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
  };

  sortBy = 'date';

  viewMode: 'list' | 'map' = 'list';
  mapListings: MapListing[] = [];
  mapBounds: MapBounds | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['city']) this.filters.city = params['city'];
      if (params['listing_type']) this.filters.listing_type = params['listing_type'];
      if (params['view'] === 'map') this.viewMode = 'map';
      this.loadListings();
    });
  }

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode = mode;
    if (mode === 'map') this.loadMapListings();
  }

  onFilterChange(): void {
    this.loadListings();
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
    return f;
  }

  loadListings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const cleanFilters: ListingFilters = {};
    if (this.filters.city) cleanFilters.city = this.filters.city;
    if (this.filters.listing_type) cleanFilters.listing_type = this.filters.listing_type;
    if (this.filters.min_price != null) cleanFilters.min_price = this.filters.min_price;
    if (this.filters.max_price != null) cleanFilters.max_price = this.filters.max_price;
    if (this.filters.rooms != null) cleanFilters.rooms = this.filters.rooms;

    this.listingsService.getAll(cleanFilters).subscribe({
      next: (data) => {
        this.listings = this.sortListings(data);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Ошибка загрузки объявлений';
        this.isLoading = false;
      },
    });
  }

  sortListings(data: Listing[]): Listing[] {
    if (this.sortBy === 'price_asc') return [...data].sort((a, b) => a.price - b.price);
    if (this.sortBy === 'price_desc') return [...data].sort((a, b) => b.price - a.price);
    return [...data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  applyFilters(): void {
    this.loadListings();
    if (this.viewMode === 'map') this.loadMapListings();
  }

  resetFilters(): void {
    this.filters = { city: '', listing_type: '', min_price: null, max_price: null, rooms: null };
    this.sortBy = 'date';
    this.loadListings();
    if (this.viewMode === 'map') this.loadMapListings();
  }

  onSortChange(): void {
    this.listings = this.sortListings(this.listings);
  }
}
