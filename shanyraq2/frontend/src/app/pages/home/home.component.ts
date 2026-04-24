import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';
import { ListingsService } from '../../services/listings.service';
import { AuthService } from '../../services/auth.service';
import { Listing, User } from '../../models/interfaces';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink, ListingCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  host: { ngSkipHydration: 'true' },
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private listingsService = inject(ListingsService);
  private authService = inject(AuthService);

  searchQuery = '';
  listings: Listing[] = [];
  myListings: Listing[] = [];
  isLoading = true;
  errorMessage = '';
  activeFilter: 'all' | 'sale' | 'rent' = 'all';
  skeletons = [1, 2, 3, 4, 5, 6];
  currentUser: User | null = null;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.loadListings();
    });
  }

  get isSeller(): boolean {
    return !!this.currentUser?.is_agent;
  }

  get activeCount(): number {
    return this.myListings.filter((l) => l.is_active).length;
  }

  loadListings(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.listingsService.getAll().subscribe({
      next: (response) => {
        const data = response.results;
        this.listings = data.slice(0, 6);
        if (this.currentUser?.is_agent) {
          this.myListings = data.filter((l) => l.owner?.id === this.currentUser!.id);
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Не удалось загрузить объявления';
        this.isLoading = false;
      },
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/catalog'], { queryParams: { city: this.searchQuery.trim() } });
    } else {
      this.router.navigate(['/catalog']);
    }
  }

  filterByType(type: 'sale' | 'rent'): void {
    this.activeFilter = type;
    this.router.navigate(['/catalog'], { queryParams: { listing_type: type } });
  }

  goToCreate(): void {
    this.router.navigate([this.authService.isLoggedIn() ? '/dashboard' : '/auth']);
  }
}
