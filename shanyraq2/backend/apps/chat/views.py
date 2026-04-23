import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdminRequest
from .prompts import SHANYRAQ_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Готовые ответы-справочник (fallback если Gemini недоступен)
FALLBACK_ANSWERS = {
    "размест": (
        "Для размещения объекта на платформе «Шанырак», пожалуйста, выполните следующие шаги:\n\n"
        "1. Пройдите авторизацию или зарегистрируйтесь на платформе.\n"
        "2. Перейдите в раздел «Личный кабинет».\n"
        "3. Нажмите «Добавить объект».\n"
        "4. Заполните карточку объекта: название, описание, тип сделки, стоимость, площадь, "
        "количество комнат, этаж, город и адрес.\n"
        "5. Загрузите фотографии объекта.\n"
        "6. Опубликуйте объявление.\n\n"
        "Если у Вас возникнут вопросы на любом из этапов, я к Вашим услугам."
    ),
    "подать": (
        "Для размещения объекта на платформе «Шанырак», пожалуйста, выполните следующие шаги:\n\n"
        "1. Пройдите авторизацию или зарегистрируйтесь на платформе.\n"
        "2. Перейдите в раздел «Личный кабинет».\n"
        "3. Нажмите «Добавить объект».\n"
        "4. Заполните карточку объекта: название, описание, тип сделки, стоимость, площадь, "
        "количество комнат, этаж, город и адрес.\n"
        "5. Загрузите фотографии объекта.\n"
        "6. Опубликуйте объявление.\n\n"
        "Если у Вас возникнут вопросы на любом из этапов, я к Вашим услугам."
    ),
    "поиск": (
        "Для поиска объектов на платформе «Шанырак» Вам доступны следующие инструменты:\n\n"
        "1. На главной странице введите город или адрес в строку поиска.\n"
        "2. Перейдите в раздел «Каталог» для просмотра всех объектов.\n"
        "3. Воспользуйтесь фильтрами: город, тип сделки (аренда/продажа), ценовой диапазон, "
        "количество комнат.\n"
        "4. Также доступна интерактивная карта для визуального поиска.\n\n"
        "Будем рады помочь Вам подобрать идеальный объект."
    ),
    "фильтр": (
        "В разделе «Каталог» Вам доступны следующие фильтры:\n\n"
        "• Город — выберите интересующий Вас город\n"
        "• Тип сделки — аренда или продажа\n"
        "• Ценовой диапазон — минимальная и максимальная стоимость\n"
        "• Количество комнат\n\n"
        "Также к Вашим услугам интерактивная карта для визуального поиска объектов. "
        "Чем ещё могу быть полезен?"
    ),
    "описан": (
        "С удовольствием помогу Вам составить описание для объекта. "
        "Пожалуйста, сообщите следующие детали:\n\n"
        "• Тип объекта (квартира, дом, пентхаус)\n"
        "• Количество комнат и площадь\n"
        "• Этаж\n"
        "• Город и район\n"
        "• Особенности (вид, ремонт, мебель, паркинг)\n"
        "• Тип сделки (аренда или продажа)\n\n"
        "На основании этих данных я подготовлю профессиональное описание для Вашего объявления."
    ),
    "избранн": (
        "Для добавления объекта в избранное откройте страницу интересующего Вас объекта "
        "и нажмите кнопку «В избранное». Для просмотра сохранённых объектов перейдите "
        "в Ваш Личный кабинет.\n\n"
        "Обратите внимание: для использования избранного необходима авторизация на платформе."
    ),
    "контакт": (
        "Контактные данные владельца объекта доступны на странице объявления. "
        "Для просмотра контактов необходимо авторизоваться на платформе.\n\n"
        "Если у Вас возникли сложности, Вы можете направить обращение в администрацию "
        "через специальную форму — я помогу Вам с этим."
    ),
    "здравствуйте": (
        "Добро пожаловать на платформу «Шанырак». Я — Ваш персональный консьерж. "
        "К Вашим услугам: консультации по работе сервиса, составление описаний для Ваших объектов "
        "и экспертная поддержка по вопросам недвижимости.\n\n"
        "Чем могу быть полезен?"
    ),
    "привет": (
        "Добро пожаловать на платформу «Шанырак». Я — Ваш персональный консьерж. "
        "К Вашим услугам: консультации по работе сервиса, составление описаний для Ваших объектов "
        "и экспертная поддержка по вопросам недвижимости.\n\n"
        "Чем могу быть полезен?"
    ),
}

DEFAULT_FALLBACK = (
    "Благодарю за Ваш вопрос. К сожалению, в настоящий момент AI-ассистент "
    "обрабатывает большое количество обращений.\n\n"
    "Я могу помочь Вам со следующими вопросами:\n"
    "• Размещение объекта на платформе\n"
    "• Поиск недвижимости и фильтры\n"
    "• Составление описания для объявления\n"
    "• Работа с избранным и личным кабинетом\n\n"
    "Для индивидуального обращения воспользуйтесь формой связи с администрацией."
)


def get_fallback_reply(message: str) -> str:
    """Поиск подходящего ответа по ключевым словам."""
    msg_lower = message.lower()
    for keyword, answer in FALLBACK_ANSWERS.items():
        if keyword in msg_lower:
            return answer
    return DEFAULT_FALLBACK


class ChatView(APIView):
    """AI чат-ассистент. Gemini API с fallback на готовые ответы."""

    permission_classes = [AllowAny]

    def post(self, request):
        user_message = request.data.get("message", "").strip()
        history = request.data.get("history", [])

        if not user_message:
            return Response(
                {"error": "Сообщение не может быть пустым"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Попробовать Gemini API
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if api_key:
            try:
                import json
                import urllib.request
                import urllib.error

                contents = []
                for msg in history[-20:]:
                    role = msg.get("role", "user")
                    text = msg.get("text", "")
                    if role == "user":
                        contents.append({"role": "user", "parts": [{"text": text}]})
                    else:
                        contents.append({"role": "model", "parts": [{"text": text}]})

                contents.append({"role": "user", "parts": [{"text": user_message}]})

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
                
                payload = {
                    "systemInstruction": {
                        "parts": [{"text": SHANYRAQ_SYSTEM_PROMPT}]
                    },
                    "contents": contents,
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 1024
                    }
                }
                
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                
                with urllib.request.urlopen(req, timeout=10) as response:
                    res_body = response.read()
                    res_json = json.loads(res_body)
                    
                    try:
                        reply = res_json["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError):
                        reply = ""
                    
                    if not reply:
                        reply = get_fallback_reply(user_message)
                        
                return Response({"reply": reply}, status=status.HTTP_200_OK)

            except Exception as e:
                logger.warning("Gemini API unavailable, using fallback: %s", e)

        # Fallback — готовые ответы
        reply = get_fallback_reply(user_message)
        return Response({"reply": reply}, status=status.HTTP_200_OK)


class EscalateView(APIView):
    """Эскалация обращения к администрации."""

    permission_classes = [AllowAny]

    def post(self, request):
        name = request.data.get("name", "").strip()
        email = request.data.get("email", "").strip()
        subject = request.data.get("subject", "").strip()
        message = request.data.get("message", "").strip()

        if not all([name, email, subject, message]):
            return Response(
                {"error": "Все поля обязательны для заполнения"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user.is_authenticated else None

        AdminRequest.objects.create(
            user=user,
            name=name,
            email=email,
            subject=subject,
            message=message,
        )

        return Response(
            {"success": True, "message": "Ваше обращение отправлено администрации. Мы свяжемся с вами в ближайшее время."},
            status=status.HTTP_201_CREATED,
        )
