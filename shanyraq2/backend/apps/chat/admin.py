from django.contrib import admin

from .models import AdminRequest, ChatSession, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("role", "text", "created_at")
    ordering = ("created_at",)


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "session_key", "message_count", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("session_key", "user__username")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChatMessageInline]

    @admin.display(description="Сообщений")
    def message_count(self, obj):
        return obj.messages.count()


@admin.register(AdminRequest)
class AdminRequestAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "email", "subject")
    readonly_fields = ("created_at",)
    list_editable = ("status",)
