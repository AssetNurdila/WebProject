from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import (
    UserProfileView,
    login_view,
    logout_view,
    register_view,
)

urlpatterns = [
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("register/", register_view, name="register"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("profile/", UserProfileView.as_view(), name="profile"),
]
