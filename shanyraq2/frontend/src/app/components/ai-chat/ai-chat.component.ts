import { Component, inject, ElementRef, ViewChild, AfterViewChecked, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  isOpen = false;
  showEscalation = false;
  userInput = '';
  isLoading = false;
  isLoadingHistory = false;
  messages: ChatMessage[] = [];
  sessionKey: string;

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
  private historyLoaded = false;

  constructor() {
    if (this.isBrowser) {
      const stored = localStorage.getItem('shanyraq_chat_session');
      this.sessionKey = stored || this.generateUUID();
      if (!stored) {
        localStorage.setItem('shanyraq_chat_session', this.sessionKey);
      }
    } else {
      this.sessionKey = 'ssr-placeholder';
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen && !this.historyLoaded) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.isLoadingHistory = true;
    this.chatService.getHistory(this.sessionKey).subscribe({
      next: (res) => {
        if (res.messages && res.messages.length > 0) {
          this.messages = res.messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'bot',
            text: m.text,
          }));
        } else {
          // Приветственное сообщение (не сохраняется в БД)
          this.messages = [{
            role: 'bot',
            text: 'Добро пожаловать. Я — персональный консьерж платформы «Шанырак». К Вашим услугам: консультации по работе сервиса, составление описаний для Ваших объектов и экспертная поддержка по вопросам недвижимости. Чем могу быть полезен?',
          }];
        }
        this.historyLoaded = true;
        this.isLoadingHistory = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages = [{
          role: 'bot',
          text: 'Добро пожаловать. Я — персональный консьерж платформы «Шанырак». К Вашим услугам: консультации по работе сервиса, составление описаний для Ваших объектов и экспертная поддержка по вопросам недвижимости. Чем могу быть полезен?',
        }];
        this.historyLoaded = true;
        this.isLoadingHistory = false;
        this.shouldScroll = true;
      },
    });
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

    this.chatService.sendMessage(text, this.messages.slice(0, -1), this.sessionKey).subscribe({
      next: (res) => {
        this.messages.push({ role: 'bot', text: res.reply });
        // Обновить session_key если сервер вернул новый
        if (res.session_key && res.session_key !== this.sessionKey) {
          this.sessionKey = res.session_key;
          if (this.isBrowser) {
            localStorage.setItem('shanyraq_chat_session', this.sessionKey);
          }
        }
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

  clearChat(): void {
    this.chatService.clearHistory(this.sessionKey).subscribe({
      next: () => {
        this.messages = [{
          role: 'bot',
          text: 'История очищена. Чем могу быть полезен?',
        }];
        this.shouldScroll = true;
      },
      error: () => {},
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

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
