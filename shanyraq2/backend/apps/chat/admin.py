from django.contrib import admin

from .models import AdminRequest


@admin.register(AdminRequest)
class AdminRequestAdmin(admin.ModelAdmin):
    list_display = ("subject", "name", "email", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "email", "subject", "message")
    readonly_fields = ("created_at",)
    list_editable = ("status",)
    ordering = ("-created_at",)
