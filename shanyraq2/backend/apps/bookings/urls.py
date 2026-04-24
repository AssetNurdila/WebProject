from django.urls import path
from .views import BookingCreateView, MyBookingsView, IncomingBookingsView

urlpatterns = [
    path('bookings/', BookingCreateView.as_view(), name='booking-create'),
    path('bookings/my/', MyBookingsView.as_view(), name='my-bookings'),
    path('bookings/incoming/', IncomingBookingsView.as_view(), name='incoming-bookings'),
    path('bookings/incoming/<int:pk>/', IncomingBookingsView.as_view(), name='booking-update'),
]
