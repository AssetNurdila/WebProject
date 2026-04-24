import threading
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Favorite, Listing
from apps.listings.serializers import (
    ListingFilterSerializer,
    ListingSerializer,
    MapListingSerializer,
)

class ListingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class ListingListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        filter_serializer = ListingFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)

        queryset = Listing.objects.all().select_related("owner").prefetch_related(
            "images"
        )
        filters = filter_serializer.validated_data

        city = filters.get("city")
        listing_type = filters.get("listing_type")
        min_price = filters.get("min_price")
        max_price = filters.get("max_price")
        rooms = filters.get("rooms")
        min_rooms = filters.get("min_rooms")

        if city:
            queryset = queryset.filter(city__iexact=city)
        if listing_type:
            queryset = queryset.filter(listing_type=listing_type)
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)
        if min_rooms is not None:
            queryset = queryset.filter(rooms__gte=min_rooms)
        elif rooms is not None:
            queryset = queryset.filter(rooms=rooms)

        ordering = request.query_params.get("ordering", "-created_at")
        allowed_ordering = ["price", "-price", "-created_at", "created_at"]
        if ordering in allowed_ordering:
            queryset = queryset.order_by(ordering)

        paginator = ListingPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ListingSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = ListingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ListingDetailView(APIView):
    def get_permissions(self):
        if self.request.method in ("PUT", "DELETE"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_object(self, pk):
        queryset = Listing.all_objects.select_related("owner").prefetch_related("images")
        return get_object_or_404(queryset, pk=pk)

    def get(self, request, pk):
        listing = self.get_object(pk)
        if not listing.is_active and (
            not request.user.is_authenticated or listing.owner != request.user
        ):
            return Response(
                {"detail": "Listing not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = ListingSerializer(listing)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        listing = self.get_object(pk)
        if listing.owner != request.user:
            return Response(
                {"detail": "Only owner can edit listing."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ListingSerializer(listing, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        listing = self.get_object(pk)
        if listing.owner != request.user:
            return Response(
                {"detail": "Only owner can delete listing."},
                status=status.HTTP_403_FORBIDDEN,
            )
        listing.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, listing_id):
        listing = get_object_or_404(Listing, pk=listing_id)
        favorite, created = Favorite.objects.get_or_create(
            user=request.user, listing=listing
        )
        if not created:
            return Response(
                {"detail": "Listing already in favorites."},
                status=status.HTTP_200_OK,
            )
        return Response({"detail": "Added to favorites."}, status=status.HTTP_201_CREATED)

    def delete(self, request, listing_id):
        listing = get_object_or_404(Listing, pk=listing_id)
        deleted_count, _ = Favorite.objects.filter(
            user=request.user, listing=listing
        ).delete()
        if deleted_count == 0:
            return Response(
                {"detail": "Favorite not found."}, status=status.HTTP_404_NOT_FOUND
            )
        return Response({"detail": "Removed from favorites."}, status=status.HTTP_200_OK)


class ListingMapView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = (
            Listing.objects.filter(latitude__isnull=False, longitude__isnull=False)
            .select_related("owner")
            .prefetch_related("images")
        )

        params = request.query_params

        listing_type = params.get("listing_type")
        if listing_type in ("rent", "sale"):
            queryset = queryset.filter(listing_type=listing_type)

        for field, param in (("price__gte", "min_price"), ("price__lte", "max_price")):
            value = params.get(param)
            if value not in (None, ""):
                try:
                    queryset = queryset.filter(**{field: float(value)})
                except ValueError:
                    pass

        rooms = params.get("rooms")
        if rooms not in (None, ""):
            try:
                queryset = queryset.filter(rooms=int(rooms))
            except ValueError:
                pass

        try:
            south = params.get("south")
            west = params.get("west")
            north = params.get("north")
            east = params.get("east")
            if all(v is not None for v in (south, west, north, east)):
                queryset = queryset.filter(
                    latitude__gte=float(south),
                    latitude__lte=float(north),
                    longitude__gte=float(west),
                    longitude__lte=float(east),
                )
        except ValueError:
            pass

        serializer = MapListingSerializer(
            queryset[:500], many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyListingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Listing.all_objects
            .filter(owner=request.user)
            .prefetch_related('images')
            .order_by('-created_at')
        )
        serializer = ListingSerializer(queryset, many=True)
        return Response(serializer.data)


class MyFavoritesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        favorites = (
            Favorite.objects.filter(user=request.user)
            .select_related("listing", "listing__owner")
            .prefetch_related("listing__images")
            .order_by("-created_at")
        )
        
        # Extract active listings only, preserving the created_at order
        listings = [
            fav.listing for fav in favorites if fav.listing.is_active
        ]
        
        # Add the is_favorited flag manually since we already know they are favorited
        for lst in listings:
            lst._is_favorited_cache = True
            
        serializer = ListingSerializer(listings, many=True, context={'request': request})
        return Response(serializer.data)
