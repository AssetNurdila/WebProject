from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    """Сессия чата с AI-ботом. Хранит историю переписки."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="chat_sessions",
        verbose_name="Пользователь",
    )
    session_key = models.CharField(
        "Ключ сессии", max_length=64, db_index=True,
        help_text="Для анонимных пользователей — UUID из фронтенда",
    )
    created_at = models.DateTimeField("Создана", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлена", auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Чат-сессия"
        verbose_name_plural = "Чат-сессии"

    def __str__(self):
        owner = self.user.username if self.user else "anonymous"
        return f"Chat {self.id} ({owner})"


class ChatMessage(models.Model):
    """Одно сообщение в чат-сессии."""

    ROLE_CHOICES = [
        ("user", "Пользователь"),
        ("bot", "Бот"),
        ("system", "Система"),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Сессия",
    )
    role = models.CharField("Роль", max_length=10, choices=ROLE_CHOICES)
    text = models.TextField("Текст")
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Сообщение чата"
        verbose_name_plural = "Сообщения чата"
        indexes = [
            models.Index(fields=["session", "created_at"]),
        ]

    def __str__(self):
        return f"[{self.role}] {self.text[:50]}"


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
