import { Component, inject, OnInit, NgZone, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ListingsService } from '../../services/listings.service';
import { Listing, User } from '../../models/interfaces';
import { MapPickerComponent, PickedLocation } from '../../components/map-picker/map-picker.component';

import { FavoritesService } from '../../services/favorites.service';
import { ListingCardComponent } from '../../components/listing-card/listing-card.component';

type NewListingForm = {
  title: string;
  description: string;
  listing_type: 'rent' | 'sale';
  price: number | null;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  virtual_tour_url: string | null;
  virtual_tour_provider: string | null;
  video_review_url: string | null;
};

type SelectedListingImage = {
  file: File;
  previewUrl: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, MapPickerComponent, ListingCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private listingsService = inject(ListingsService);
  private favoritesService = inject(FavoritesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  activeSection: 'listings' | 'create' | 'profile' | 'favorites' = 'listings';

  currentUser: User | null = null;
  myListings: Listing[] = [];
  isLoadingListings = true;
  listingsError = '';

  favoriteListings: Listing[] = [];
  isLoadingFavorites = true;
  favoritesError = '';

  profileForm = { username: '', phone: '' };
  profileSaved = false;
  profileEditing = false;
  profileError = '';
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  avatarError = '';

  readonly maxListingImages = 10;
  readonly maxListingImageSizeBytes = 5 * 1024 * 1024;
  readonly acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  newListing: NewListingForm = this.getEmptyListingForm();
  selectedImages: SelectedListingImage[] = [];
  imagesError = '';
  createError = '';
  createSuccess = false;
  isCreating = false;

  onPickLocation(loc: PickedLocation): void {
    if (Number.isNaN(loc.latitude) || Number.isNaN(loc.longitude)) {
      this.newListing.latitude = null;
      this.newListing.longitude = null;
    } else {
      this.newListing.latitude = loc.latitude;
      this.newListing.longitude = loc.longitude;
    }
  }

  get mapSearchQuery(): string {
    const parts = [this.newListing.address, this.newListing.city].filter(Boolean);
    return parts.join(', ');
  }

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.resetSelectedImages());

    this.authService.currentUser$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.profileForm.username = user.username;
        this.profileForm.phone = user.phone ?? '';
        if (user.is_agent) {
          this.loadMyListings(user.id);
        }
        const section = this.route.snapshot.queryParamMap.get('section') as any;
        this.activeSection = section ?? (user.is_agent ? 'listings' : 'profile');
      }
    });

    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params) => {
      const section = params.get('section') as any;
      if (section) this.activeSection = section;
      if (this.activeSection === 'favorites') {
        this.loadFavorites();
      }
    });
  }

  loadFavorites(): void {
    this.isLoadingFavorites = true;
    this.favoritesError = '';
    this.favoritesService.getAll().subscribe({
      next: (data) => {
        this.favoriteListings = data;
        this.isLoadingFavorites = false;
      },
      error: () => {
        this.favoritesError = 'Не удалось загрузить избранное';
        this.isLoadingFavorites = false;
      }
    });
  }

  loadMyListings(userId: number): void {
    this.isLoadingListings = true;
    this.listingsError = '';
    this.listingsService.getMyListings().subscribe({
      next: (data) => {
        this.myListings = data;
        this.isLoadingListings = false;
      },
      error: () => {
        this.listingsError = 'Не удалось загрузить объявления';
        this.isLoadingListings = false;
      },
    });
  }

  deleteListing(id: number): void {
    if (!confirm('Удалить объявление?')) return;
    this.listingsService.delete(id).subscribe({
      next: () => {
        this.myListings = this.myListings.filter((l) => l.id !== id);
      },
      error: () => alert('Ошибка при удалении'),
    });
  }

  toggleActive(listing: Listing): void {
    this.listingsService.update(listing.id, { is_active: !listing.is_active }).subscribe({
      next: (updated) => {
        const idx = this.myListings.findIndex((l) => l.id === listing.id);
        if (idx !== -1) this.myListings[idx] = updated;
      },
      error: () => alert('Ошибка при обновлении'),
    });
  }

  goToEdit(id: number): void {
    this.router.navigate(['/listing', id]);
  }

  get selectedImageCount(): number {
    return this.selectedImages.length;
  }

  onCreateListing(): void {
    if (
      !this.newListing.title ||
      !this.newListing.price ||
      !this.newListing.city ||
      !this.newListing.address
    ) {
      this.createError = 'Заполните все обязательные поля';
      return;
    }
    this.isCreating = true;
    this.createError = '';
    this.imagesError = '';

    this.listingsService.create(this.buildListingFormData()).subscribe({
      next: (listing) => {
        this.myListings.unshift(listing);
        this.createSuccess = true;
        this.isCreating = false;
        this.newListing = this.getEmptyListingForm();
        this.resetSelectedImages();
        setTimeout(() => {
          this.createSuccess = false;
          this.activeSection = 'listings';
        }, 2000);
      },
      error: (err) => {
        this.isCreating = false;
        const errors = err?.error;
        if (errors) {
          const first = Object.values(errors)[0];
          this.createError = Array.isArray(first) ? (first as string[])[0] : String(first);
        } else {
          this.createError = 'Ошибка создания объявления';
        }
      },
    });
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) {
      return;
    }

    this.imagesError = '';
    const availableSlots = this.maxListingImages - this.selectedImages.length;

    if (availableSlots <= 0) {
      this.imagesError = `Можно загрузить не более ${this.maxListingImages} фотографий.`;
      return;
    }

    for (const file of files.slice(0, availableSlots)) {
      const validationError = this.validateImageFile(file);
      if (validationError) {
        this.imagesError = validationError;
        continue;
      }

      this.selectedImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (files.length > availableSlots) {
      this.imagesError = `Можно загрузить не более ${this.maxListingImages} фотографий.`;
    }
  }

  removeSelectedImage(index: number): void {
    const image = this.selectedImages[index];
    if (!image) {
      return;
    }

    URL.revokeObjectURL(image.previewUrl);
    this.selectedImages.splice(index, 1);
    if (!this.selectedImages.length) {
      this.imagesError = '';
    }
  }

  onAvatarSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.avatarFile = file;
    this.avatarError = '';
    const reader = new FileReader();
    reader.onload = (e) => {
      this.zone.run(() => {
        this.avatarPreview = e.target?.result as string;
      });
    };
    reader.readAsDataURL(file);
  }

  saveAvatarOnly(): void {
    if (!this.avatarFile) return;
    this.avatarError = '';
    console.log('[Avatar] Uploading file:', this.avatarFile.name, this.avatarFile.size);
    this.authService.updateProfile({
      username: this.currentUser?.username ?? this.profileForm.username,
      avatar: this.avatarFile,
    }).subscribe({
      next: (updatedUser) => {
        console.log('[Avatar] Upload success, avatar URL:', updatedUser.avatar);
        this.zone.run(() => {
          this.currentUser = updatedUser;
          this.profileSaved = true;
          this.avatarFile = null;
          this.avatarPreview = null;
          setTimeout(() => (this.profileSaved = false), 3000);
        });
      },
      error: (err) => {
        console.error('[Avatar] Upload error:', err);
        this.zone.run(() => {
          this.avatarError = err?.error ? JSON.stringify(err.error) : 'Ошибка загрузки фото';
        });
      },
    });
  }

  saveProfile(): void {
    if (!this.profileForm.username.trim()) {
      this.profileError = 'Логин не может быть пустым';
      return;
    }
    this.profileError = '';
    this.authService.updateProfile({
      username: this.profileForm.username,
      phone: this.profileForm.phone,
      ...(this.avatarFile ? { avatar: this.avatarFile } : {}),
    }).subscribe({
      next: (updatedUser) => {
        this.zone.run(() => {
          this.currentUser = updatedUser;
          this.profileSaved = true;
          this.profileEditing = false;
          this.avatarFile = null;
          this.avatarPreview = null;
          setTimeout(() => (this.profileSaved = false), 3000);
        });
      },
      error: (err) => {
        const errors = err?.error;
        if (errors) {
          const first = Object.values(errors)[0];
          this.profileError = Array.isArray(first) ? (first as string[])[0] : String(first);
        } else {
          this.profileError = 'Ошибка сохранения';
        }
      },
    });
  }

  formatPrice(price: number): string {
    return '₸ ' + Number(price).toLocaleString('ru-RU');
  }

  private getEmptyListingForm(): NewListingForm {
    return {
      title: '',
      description: '',
      listing_type: 'rent',
      price: null,
      area: null,
      rooms: null,
      floor: null,
      city: '',
      address: '',
      latitude: null,
      longitude: null,
      virtual_tour_url: '',
      virtual_tour_provider: '',
      video_review_url: '',
    };
  }

  private buildListingFormData(): FormData {
    const formData = new FormData();

    const fields: Array<[keyof NewListingForm, string | number | null]> = [
      ['title', this.newListing.title],
      ['description', this.newListing.description],
      ['listing_type', this.newListing.listing_type],
      ['price', this.newListing.price],
      ['area', this.newListing.area],
      ['rooms', this.newListing.rooms],
      ['floor', this.newListing.floor],
      ['city', this.newListing.city],
      ['address', this.newListing.address],
      ['latitude', this.newListing.latitude],
      ['longitude', this.newListing.longitude],
      ['virtual_tour_url', this.newListing.virtual_tour_url],
      ['virtual_tour_provider', this.newListing.virtual_tour_provider],
      ['video_review_url', this.newListing.video_review_url],
    ];

    for (const [key, value] of fields) {
      if (value === null || value === undefined) {
        continue;
      }
      formData.append(key, String(value));
    }

    for (const image of this.selectedImages) {
      formData.append('images', image.file);
    }

    return formData;
  }

  private validateImageFile(file: File): string | null {
    if (!this.acceptedImageTypes.has(file.type)) {
      return 'Допустимы только изображения JPG, JPEG, PNG или WEBP.';
    }

    if (file.size > this.maxListingImageSizeBytes) {
      return 'Размер каждого изображения должен быть не больше 5 МБ.';
    }

    return null;
  }

  private resetSelectedImages(): void {
    for (const image of this.selectedImages) {
      URL.revokeObjectURL(image.previewUrl);
    }
    this.selectedImages = [];
    this.imagesError = '';
  }
}
