import { Injectable, signal } from '@angular/core';
import { ListingFilters } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  currentFilters = signal<ListingFilters>({});

  setFilters(filters: ListingFilters) {
    this.currentFilters.set(filters);
  }

  getFilters(): ListingFilters {
    return this.currentFilters();
  }
}
