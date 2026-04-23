import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Listing } from '../../models/interfaces';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [],
  templateUrl: './listing-card.component.html',
  styleUrl: './listing-card.component.css',
})
export class ListingCardComponent {
  @Input() listing!: Listing;

  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private authModal = inject(AuthModalService);

  isFavorited = false;

  get mainImage(): string | null {
    const main = this.listing.images?.find((img) => img.is_main);
    return main?.image ?? this.listing.images?.[0]?.image ?? null;
  }

  get formattedPrice(): string {
    return '₸ ' + Number(this.listing.price).toLocaleString('ru-RU');
  }

  get priceLabel(): string {
    return this.listing.listing_type === 'rent'
      ? `${this.formattedPrice} / мес`
      : this.formattedPrice;
  }

  goToListing(): void {
    this.router.navigate(['/listing', this.listing.id]);
  }

  toggleFavorite(event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.authModal.open();
      return;
    }
    if (this.isFavorited) {
      this.favoritesService.remove(this.listing.id).subscribe({
        next: () => (this.isFavorited = false),
        error: () => {},
      });
    } else {
      this.favoritesService.add(this.listing.id).subscribe({
        next: () => (this.isFavorited = true),
        error: () => {},
      });
    }
  }
}
