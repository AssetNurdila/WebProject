from django.conf import settings
from django.db import models
from apps.listings.models import Listing

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('accepted', 'Принята'),
        ('rejected', 'Отклонена'),
        ('cancelled', 'Отменена'),
    ]

    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name='bookings'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    message = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES,
        default='pending', db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} -> {self.listing.title} [{self.status}]"
