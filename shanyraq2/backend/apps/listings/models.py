import logging

from django.conf import settings
from django.db import models

logger = logging.getLogger(__name__)


def geocode_address(city: str, address: str):
    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeopyError

        geolocator = Nominatim(user_agent="shanyrak-real-estate", timeout=5)
        query = f"{address}, {city}, Kazakhstan"
        location = geolocator.geocode(query)
        if location:
            return location.latitude, location.longitude
    except Exception as exc:
        logger.warning("Geocoding failed: %s", exc)
    return None, None


class ActiveListingManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class Listing(models.Model):
    LISTING_TYPE_CHOICES = (
        ("rent", "Rent"),
        ("sale", "Sale"),
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    area = models.FloatField()
    rooms = models.IntegerField()
    floor = models.IntegerField()
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActiveListingManager()
    all_objects = models.Manager()

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        needs_geocoding = self.latitude is None or self.longitude is None
        if self.pk:
            try:
                old = Listing.all_objects.get(pk=self.pk)
                if old.city != self.city or old.address != self.address:
                    needs_geocoding = True
            except Listing.DoesNotExist:
                pass
        if needs_geocoding and self.city and self.address:
            lat, lng = geocode_address(self.city, self.address)
            if lat is not None and lng is not None:
                self.latitude = lat
                self.longitude = lng
        super().save(*args, **kwargs)


class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="listing_images/")
    is_main = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"Image for {self.listing.title}"


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "listing")

    def __str__(self) -> str:
        return f"{self.user.username} -> {self.listing.title}"
