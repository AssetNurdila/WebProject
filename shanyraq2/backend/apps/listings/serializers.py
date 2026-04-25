from rest_framework import serializers

from apps.listings.models import Listing, ListingImage
from apps.users.serializers import UserProfileSerializer


class ListingFilterSerializer(serializers.Serializer):
    city = serializers.CharField(required=False)
    listing_type = serializers.ChoiceField(
        choices=Listing.LISTING_TYPE_CHOICES, required=False
    )
    min_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )
    max_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )
    rooms = serializers.IntegerField(required=False, min_value=1)
    min_rooms = serializers.IntegerField(required=False, min_value=1)


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ("id", "image", "is_main")


class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    owner = UserProfileSerializer(read_only=True)
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "owner",
            "title",
            "description",
            "listing_type",
            "price",
            "area",
            "rooms",
            "floor",
            "city",
            "address",
            "latitude",
            "longitude",
            "is_active",
            "created_at",
            "updated_at",
            "images",
            "is_favorited",
        )
        read_only_fields = ("owner", "created_at", "updated_at", "is_active")


    def get_is_favorited(self, obj):
        if hasattr(obj, '_is_favorited_cache'):
            return obj._is_favorited_cache
            
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if favorited_by__user is prefetched, otherwise hit DB
            if hasattr(obj, '_prefetched_objects_cache') and 'favorited_by' in obj._prefetched_objects_cache:
                return any(fav.user_id == request.user.id for fav in obj.favorited_by.all())
            return obj.favorited_by.filter(user=request.user).exists()
        return False

class MapListingSerializer(serializers.ModelSerializer):
    main_image = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "title",
            "price",
            "listing_type",
            "rooms",
            "area",
            "city",
            "address",
            "latitude",
            "longitude",
            "main_image",
            "is_favorited",
        )

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorited_by.filter(user=request.user).exists()
        return False

    def get_main_image(self, obj):
        images = list(obj.images.all())
        img = next((i for i in images if i.is_main), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get("request")
            url = img.image.url
            return request.build_absolute_uri(url) if request else url
        return None
