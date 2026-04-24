import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ListingsService } from '../../services/listings.service';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';
import { Listing, ListingImage } from '../../models/interfaces';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [RouterLink, ListingCardComponent],
  templateUrl: './listing-detail.component.html',
  styleUrl: './listing-detail.component.css',
})
export class ListingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listingsService = inject(ListingsService);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);

  listing: Listing | null = null;
  similarListings: Listing[] = [];
  activeImage: ListingImage | null = null;
  isLoading = true;
  errorMessage = '';
  isFavorited = false;
  toastMessage = '';

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isOwner(): boolean {
    return !!this.currentUser && this.listing?.owner?.id === this.currentUser.id;
  }

  get formattedPrice(): string {
    if (!this.listing) return '';
    const price = '₸ ' + Number(this.listing.price).toLocaleString('ru-RU');
    return this.listing.listing_type === 'rent' ? `${price} / мес` : price;
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      if (id) this.loadListing(id);
    });
  }

  loadListing(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.listingsService.getById(id).subscribe({
      next: (listing) => {
        this.listing = listing;
        this.activeImage = listing.images?.find((i) => i.is_main) ?? listing.images?.[0] ?? null;
        this.isLoading = false;
        this.loadSimilar(listing.city, listing.id);
      },
      error: () => {
        this.errorMessage = 'Объявление не найдено';
        this.isLoading = false;
      },
    });
  }

  loadSimilar(city: string, excludeId: number): void {
    this.listingsService.getAll({ city }).subscribe({
      next: (response) => {
        const data = response.results;
        this.similarListings = data.filter((l) => l.id !== excludeId).slice(0, 3);
      },
      error: () => {},
    });
  }

  selectImage(image: ListingImage): void {
    this.activeImage = image;
  }

  toggleFavorite(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth']);
      return;
    }
    if (!this.listing) return;
    if (this.isFavorited) {
      this.favoritesService.remove(this.listing.id).subscribe({
        next: () => {
          this.isFavorited = false;
          this.showToast('Удалено из избранного');
        },
        error: () => this.showToast('Ошибка'),
      });
    } else {
      this.favoritesService.add(this.listing.id).subscribe({
        next: () => {
          this.isFavorited = true;
          this.showToast('Добавлено в избранное');
        },
        error: () => this.showToast('Ошибка'),
      });
    }
  }

  deleteListing(): void {
    if (!this.listing || !confirm('Удалить объявление?')) return;
    this.listingsService.delete(this.listing.id).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => this.showToast('Ошибка удаления'),
    });
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => (this.toastMessage = ''), 3000);
  }
}
