import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Listing, ListingFilters, MapBounds, MapListing, PaginatedResponse } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private http = inject(HttpClient);

  getAll(filters: ListingFilters = {}, page = 1): Observable<PaginatedResponse<Listing>> {
    let params = new HttpParams().set('page', String(page));
    if (filters.city) params = params.set('city', filters.city);
    if (filters.listing_type) params = params.set('listing_type', filters.listing_type);
    if (filters.min_price != null) params = params.set('min_price', String(filters.min_price));
    if (filters.max_price != null) params = params.set('max_price', String(filters.max_price));
    if (filters.rooms != null) params = params.set('rooms', String(filters.rooms));
    if (filters.min_rooms != null) params = params.set('min_rooms', String(filters.min_rooms));
    return this.http.get<PaginatedResponse<Listing>>('/api/listings/', { params });
  }

  getMyListings(): Observable<Listing[]> {
    return this.http.get<Listing[]>('/api/listings/my/');
  }

  getById(id: number): Observable<Listing> {
    return this.http.get<Listing>(`/api/listings/${id}/`);
  }

  create(data: any): Observable<Listing> {
    return this.http.post<Listing>('/api/listings/', data);
  }

  update(id: number, data: any): Observable<Listing> {
    return this.http.put<Listing>(`/api/listings/${id}/`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/listings/${id}/`);
  }

  getMapListings(
    filters: ListingFilters = {},
    bounds?: MapBounds,
  ): Observable<MapListing[]> {
    let params = new HttpParams();
    if (filters.listing_type) params = params.set('listing_type', filters.listing_type);
    if (filters.min_price != null) params = params.set('min_price', String(filters.min_price));
    if (filters.max_price != null) params = params.set('max_price', String(filters.max_price));
    if (filters.rooms != null) params = params.set('rooms', String(filters.rooms));
    if (bounds) {
      params = params
        .set('south', String(bounds.south))
        .set('west', String(bounds.west))
        .set('north', String(bounds.north))
        .set('east', String(bounds.east));
    }
    return this.http.get<MapListing[]>('/api/listings/map/', { params });
  }
}
