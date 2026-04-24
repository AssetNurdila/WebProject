from rest_framework import serializers
from .models import Booking

class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ('listing', 'message', 'phone')

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
