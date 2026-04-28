import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Listing, ListingFilters, MapBounds, MapListing, PaginatedResponse } from '../models/interfaces';

/*
// ============================================================================
// Virtual Tour demo templates — add more mock tour links here
// ============================================================================
// Use these values when creating new listings via the dashboard form to test.
//
// Template 1: Premium House with 360° Tour
// {
//   title: "Premium House with 360° Tour",
//   listing_type: "sale",
//   virtual_tour_url: "https://my.matterport.com/show?play=1&lang=en-US&m=vNtptZXMm8U",
//   virtual_tour_provider: "matterport",
//   video_review_url: ""
// }
//
// Template 2: Business Center Virtual Tour
// {
//   title: "Business Center Virtual Tour",
//   listing_type: "rent",
//   virtual_tour_url: "YOUR_KUULA_OR_CLOUDPANO_LINK_HERE",
//   virtual_tour_provider: "custom",
//   video_review_url: ""
// }
//
// Template 3: Land Plot Video Overview
// {
//   title: "Land Plot Video Overview",
//   listing_type: "sale",
//   virtual_tour_url: "",
//   virtual_tour_provider: "",
//   video_review_url: "https://www.youtube.com/watch?v=YOUR_YOUTUBE_VIDEO_ID"
// }
// ============================================================================
*/

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
    if (filters.ordering) params = params.set('ordering', filters.ordering);
    return this.http.get<PaginatedResponse<Listing>>('/api/listings/', { params });
  }

  getMyListings(): Observable<Listing[]> {
    return this.http.get<Listing[]>('/api/listings/my/');
  }

  getById(id: number): Observable<Listing> {
    return this.http.get<Listing>(`/api/listings/${id}/`);
  }

  create(data: FormData | Partial<Listing>): Observable<Listing> {
    return this.http.post<Listing>('/api/listings/', data);
  }

  update(id: number, data: FormData | Partial<Listing>): Observable<Listing> {
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
