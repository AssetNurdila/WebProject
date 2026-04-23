from django.urls import path

from .views import ChatView, EscalateView

urlpatterns = [
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("escalate/", EscalateView.as_view(), name="ai-escalate"),
]
