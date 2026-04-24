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
        )
        read_only_fields = ("owner", "created_at", "updated_at")


class MapListingSerializer(serializers.ModelSerializer):
    main_image = serializers.SerializerMethodField()

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
        )

    def get_main_image(self, obj):
        images = list(obj.images.all())
        img = next((i for i in images if i.is_main), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get("request")
            url = img.image.url
            return request.build_absolute_uri(url) if request else url
        return None
