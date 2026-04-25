export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  avatar?: string;
  is_agent: boolean;
}

export interface ListingImage {
  id: number;
  image: string;
  is_main: boolean;
}

export interface Listing {
  id: number;
  title: string;
  description: string;
  listing_type: 'rent' | 'sale';
  price: number;
  area: number;
  rooms: number;
  floor: number;
  city: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  images: ListingImage[];
  owner: User;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_favorited?: boolean;
}

export interface MapListing {
  id: number;
  title: string;
  price: number;
  listing_type: 'rent' | 'sale';
  rooms: number;
  area: number;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  main_image: string | null;
  is_favorited?: boolean;
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ListingFilters {
  city?: string;
  listing_type?: string;
  min_price?: number | null;
  max_price?: number | null;
  rooms?: number | null;
  min_rooms?: number | null;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
