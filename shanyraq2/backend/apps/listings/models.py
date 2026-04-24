import logging

from django.conf import settings
from django.db import models

logger = logging.getLogger(__name__)


import threading

def _geocode_listing(listing_id, city, address):
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent="shanyrak-real-estate", timeout=5)
        # Улучшение поискового запроса
        query = f"Казахстан, {city}, {address}"
        location = geolocator.geocode(query)
        if location:
            # Безопасное сохранение в потоке
            Listing.all_objects.filter(pk=listing_id).update(
                latitude=location.latitude,
                longitude=location.longitude
            )
    except Exception as exc:
        # Обработка ошибок
        logger.warning("Geocoding failed for listing %s: %s", listing_id, exc)


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
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES, db_index=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, db_index=True)
    area = models.FloatField()
    rooms = models.IntegerField(db_index=True)
    floor = models.IntegerField()
    city = models.CharField(max_length=100, db_index=True)
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

    class Meta:
        indexes = [
            models.Index(fields=['city', 'listing_type', 'price'], name='listing_filter_idx'),
            models.Index(models.functions.Upper('city'), name='listing_city_upper_idx'),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        # Приоритет ручного ввода: не запускаем, если координаты уже есть
        needs_geocoding = not self.latitude or not self.longitude

        super().save(*args, **kwargs)

        if is_new and needs_geocoding and self.city and self.address:
            threading.Thread(
                target=_geocode_listing,
                args=(self.pk, self.city, self.address),
                daemon=True
            ).start()


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
