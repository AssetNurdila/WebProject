import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export interface ChatResponse {
  reply: string;
  session_key: string;
}

export interface ChatHistoryResponse {
  session_key: string;
  messages: Array<{ role: string; text: string; created_at: string }>;
}

export interface EscalatePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface EscalateResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);

  sendMessage(message: string, history: ChatMessage[], sessionKey: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/ai/chat/', { message, history, session_key: sessionKey });
  }

  getHistory(sessionKey: string): Observable<ChatHistoryResponse> {
    return this.http.get<ChatHistoryResponse>('/api/ai/chat/history/', {
      params: { session_key: sessionKey },
    });
  }

  clearHistory(sessionKey: string): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>('/api/ai/chat/clear/', {
      body: { session_key: sessionKey },
    });
  }

  escalate(data: EscalatePayload): Observable<EscalateResponse> {
    return this.http.post<EscalateResponse>('/api/ai/escalate/', data);
  }
}
