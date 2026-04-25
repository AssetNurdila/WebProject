from rest_framework import serializers
from .models import Booking

from apps.listings.models import Listing

class BookingCreateSerializer(serializers.ModelSerializer):
    listing = serializers.PrimaryKeyRelatedField(queryset=Listing.objects.all())

    class Meta:
        model = Booking
        fields = ('listing', 'message', 'phone')

    def validate_listing(self, value):
        request = self.context.get('request')
        if request and value.owner == request.user:
            raise serializers.ValidationError("Нельзя забронировать собственное объявление.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            listing = attrs.get('listing')
            if Booking.objects.filter(listing=listing, user=request.user, status='pending').exists():
                raise serializers.ValidationError("У вас уже есть активная заявка на это объявление.")
        return attrs

class BookingSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(
        source='listing.title', read_only=True
    )
    user_username = serializers.CharField(
        source='user.username', read_only=True
    )

    class Meta:
        model = Booking
        fields = (
            'id', 'listing', 'listing_title',
            'user', 'user_username', 'message',
            'phone', 'status', 'created_at'
        )
        read_only_fields = ('user', 'status', 'created_at')
