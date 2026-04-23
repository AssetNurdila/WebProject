import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export interface ChatResponse {
  reply: string;
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

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatResponse> {
    return this.http.post<ChatResponse>('/api/ai/chat/', { message, history });
  }

  escalate(data: EscalatePayload): Observable<EscalateResponse> {
    return this.http.post<EscalateResponse>('/api/ai/escalate/', data);
  }
}
