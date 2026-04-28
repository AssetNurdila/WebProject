from django.urls import path

from .views import ChatView, ChatHistoryView, ClearChatView, EscalateView

urlpatterns = [
    path("chat/", ChatView.as_view(), name="ai-chat"),
    path("chat/history/", ChatHistoryView.as_view(), name="ai-chat-history"),
    path("chat/clear/", ClearChatView.as_view(), name="ai-chat-clear"),
    path("escalate/", EscalateView.as_view(), name="ai-escalate"),
]
