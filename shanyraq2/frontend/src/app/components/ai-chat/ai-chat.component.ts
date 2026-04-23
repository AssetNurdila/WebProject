import { Component, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage } from '../../services/ai-chat.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.css',
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private chatService = inject(AiChatService);

  isOpen = false;
  showEscalation = false;
  userInput = '';
  isLoading = false;
  messages: ChatMessage[] = [];

  // Escalation form
  escName = '';
  escEmail = '';
  escSubject = '';
  escMessage = '';
  escSending = false;
  escSent = false;

  quickActions = [
    { label: 'Размещение объекта', text: 'Подскажите, как разместить объект на платформе?' },
    { label: 'Составить описание', text: 'Прошу помочь составить описание для объекта недвижимости' },
    { label: 'Поиск недвижимости', text: 'Как воспользоваться поиском и фильтрами на платформе?' },
    { label: 'Связаться с администрацией', text: '__ESCALATE__' },
  ];

  private shouldScroll = false;

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.messages.push({
        role: 'bot',
        text: 'Добро пожаловать. Я — персональный консьерж платформы «Шанырак». К Вашим услугам: консультации по работе сервиса, составление описаний для Ваших объектов и экспертная поддержка по вопросам недвижимости. Чем могу быть полезен?',
      });
    }
  }

  sendQuickAction(action: { label: string; text: string }): void {
    if (action.text === '__ESCALATE__') {
      this.showEscalation = true;
      return;
    }
    this.userInput = action.text;
    this.send();
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ role: 'user', text });
    this.userInput = '';
    this.isLoading = true;
    this.shouldScroll = true;

    this.chatService.sendMessage(text, this.messages.slice(0, -1)).subscribe({
      next: (res) => {
        this.messages.push({ role: 'bot', text: res.reply });
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          role: 'bot',
          text: 'Произошла ошибка. Попробуйте ещё раз или обратитесь к администрации.',
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
    });
  }

  submitEscalation(): void {
    if (!this.escName || !this.escEmail || !this.escSubject || !this.escMessage) return;
    this.escSending = true;

    this.chatService
      .escalate({
        name: this.escName,
        email: this.escEmail,
        subject: this.escSubject,
        message: this.escMessage,
      })
      .subscribe({
        next: () => {
          this.escSending = false;
          this.escSent = true;
        },
        error: () => {
          this.escSending = false;
        },
      });
  }

  closeEscalation(): void {
    this.showEscalation = false;
    this.escSent = false;
    this.escName = '';
    this.escEmail = '';
    this.escSubject = '';
    this.escMessage = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (_) {}
  }
}
