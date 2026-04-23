from django.urls import path

from apps.listings.views import (
    FavoriteView,
    ListingDetailView,
    ListingListCreateView,
    ListingMapView,
)

urlpatterns = [
    path("listings/", ListingListCreateView.as_view(), name="listing-list-create"),
    path("listings/map/", ListingMapView.as_view(), name="listing-map"),
    path("listings/<int:pk>/", ListingDetailView.as_view(), name="listing-detail"),
    path("favorites/<int:listing_id>/", FavoriteView.as_view(), name="favorite"),
]
