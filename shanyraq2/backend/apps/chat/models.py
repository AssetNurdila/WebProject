from django.conf import settings
from django.db import models


class AdminRequest(models.Model):
    """Обращение пользователя, эскалированное AI-ботом к администрации."""

    STATUS_CHOICES = [
        ("new", "Новое"),
        ("in_progress", "В работе"),
        ("resolved", "Решено"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Пользователь",
    )
    name = models.CharField("Имя", max_length=150)
    email = models.EmailField("Email")
    subject = models.CharField("Тема", max_length=255)
    message = models.TextField("Сообщение")
    status = models.CharField(
        "Статус", max_length=20, choices=STATUS_CHOICES, default="new"
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Обращение к администрации"
        verbose_name_plural = "Обращения к администрации"

    def __str__(self):
        return f"[{self.get_status_display()}] {self.subject} — {self.name}"
