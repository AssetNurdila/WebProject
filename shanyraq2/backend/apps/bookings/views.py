from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Booking
from .serializers import BookingCreateSerializer, BookingSerializer

class BookingCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(user=request.user)
        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )

class MyBookingsView(APIView):
    """Заявки текущего пользователя (арендатор/покупатель)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(
            user=request.user
        ).select_related('listing', 'user').only(
            'id', 'message', 'phone', 'status', 'created_at',
            'listing__id', 'listing__title',
            'user__id', 'user__username'
        )
        return Response(BookingSerializer(bookings, many=True).data)

class IncomingBookingsView(APIView):
    """Входящие заявки для агента — только по его объявлениям."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(
            listing__owner=request.user
        ).select_related('listing', 'user').only(
            'id', 'message', 'phone', 'status', 'created_at',
            'listing__id', 'listing__title',
            'user__id', 'user__username'
        )
        return Response(BookingSerializer(bookings, many=True).data)

class BookingStatusUpdateView(APIView):
    """Агент меняет статус заявки."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        booking = Booking.objects.filter(
            pk=pk, listing__owner=request.user
        ).first()
        if not booking:
            return Response(status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get('status')
        if new_status not in ('accepted', 'rejected'):
            return Response(
                {'detail': 'Недопустимый статус.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        booking.status = new_status
        booking.save(update_fields=['status'])
        return Response(BookingSerializer(booking).data)
