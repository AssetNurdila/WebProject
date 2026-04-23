import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private http = inject(HttpClient);

  add(listingId: number): Observable<any> {
    return this.http.post(`/api/favorites/${listingId}/`, {});
  }

  remove(listingId: number): Observable<any> {
    return this.http.delete(`/api/favorites/${listingId}/`);
  }
}
