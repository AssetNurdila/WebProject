import { Component, Input, inject, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
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
export class ListingCardComponent implements OnInit, OnChanges {
  @Input() listing!: Listing;

  private router = inject(Router);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private authModal = inject(AuthModalService);
  private cdr = inject(ChangeDetectorRef);

  isFavorited = false;

  ngOnInit(): void {
    if (this.listing) {
      this.isFavorited = !!this.listing.is_favorited;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listing'] && this.listing) {
      this.isFavorited = !!this.listing.is_favorited;
    }
  }

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
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.authModal.open();
      return;
    }
    if (this.isFavorited) {
      this.favoritesService.remove(this.listing.id).subscribe({
        next: () => {
          this.isFavorited = false;
          if (this.listing) this.listing.is_favorited = false;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    } else {
      this.favoritesService.add(this.listing.id).subscribe({
        next: () => {
          this.isFavorited = true;
          if (this.listing) this.listing.is_favorited = true;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
  }
}
