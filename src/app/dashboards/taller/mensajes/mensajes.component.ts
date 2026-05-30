import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpService } from '../../../shared/services/http.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface Mensaje {
  id_mensaje: number;
  id_incidente: number;
  id_usuario?: number;
  id_taller?: number;
  contenido: string;
  leido: boolean;
  created_at: string;
}

@Component({
  selector: 'app-mensajes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mensajes-container">
      <div class="mensajes-header">
        <button (click)="volver()" class="btn-back">← Volver</button>
        <h2>Mensajes <span class="inc">/ Incidente #{{ idIncidente }}</span></h2>
      </div>

      <div *ngIf="cargando && mensajes.length === 0" class="loading">
        Cargando mensajes...
      </div>
      <div *ngIf="error" class="error-msg">{{ error }}</div>

      <div class="chat-box" #chatBox>
        <div
          *ngFor="let m of mensajes"
          class="mensaje"
          [class.enviado]="m.id_taller != null"
          [class.recibido]="m.id_usuario != null"
        >
          <span class="autor">{{ m.id_taller != null ? 'Tú (Taller)' : 'Cliente' }}</span>
          <p class="contenido">{{ m.contenido }}</p>
          <span class="hora">{{ m.created_at | date:'HH:mm dd/MM' }}</span>
        </div>

        <div *ngIf="!cargando && mensajes.length === 0" class="empty">
          No hay mensajes aún. Escribe el primero.
        </div>
      </div>

      <div class="input-area">
        <textarea
          [(ngModel)]="nuevoMensaje"
          placeholder="Escribe un mensaje..."
          rows="2"
          (keydown.enter)="onEnter($event)"
        ></textarea>
        <button (click)="enviar()" [disabled]="enviando || !nuevoMensaje.trim()">
          {{ enviando ? 'Enviando...' : 'Enviar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mensajes-container {
      display: flex; flex-direction: column;
      height: calc(100vh - 48px);
      padding: 24px 28px; gap: 16px;
      max-width: var(--container-narrow); margin: 0 auto; width: 100%;
    }
    .mensajes-header {
      display: flex; align-items: center; gap: 14px;
      padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);
    }
    .mensajes-header h2 {
      margin: 0; font-size: 20px; font-weight: 600;
      letter-spacing: -0.02em; color: var(--ink);
    }
    .mensajes-header h2 .inc {
      font-family: var(--font-mono); font-size: 12px; font-weight: 500;
      letter-spacing: 0.06em; color: var(--ink-muted); margin-left: 6px;
    }
    .btn-back {
      background: transparent; border: 1px solid var(--border); border-radius: var(--radius-md);
      padding: 7px 12px; cursor: pointer; font-size: 12px; font-weight: 500;
      color: var(--ink-subtle); font-family: inherit;
      transition: background 140ms, color 140ms, border-color 140ms;
    }
    .btn-back:hover {
      background: var(--overlay); color: var(--ink); border-color: var(--border-strong);
    }
    .loading, .empty {
      text-align: center; padding: 36px; color: var(--ink-muted); font-size: 13px;
    }
    .error-msg {
      padding: 12px 14px; color: var(--danger-ink);
      background: var(--danger-soft); border: 1px solid rgba(244,63,94,0.3);
      border-left: 2px solid var(--danger); border-radius: var(--radius-md);
      font-size: 13px;
    }
    .chat-box {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column;
      gap: 10px; padding: 18px; border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg); background: var(--surface-muted);
      box-shadow: inset 0 1px 0 rgba(0,0,0,0.2);
    }
    .mensaje {
      max-width: 72%; padding: 10px 14px; border-radius: var(--radius-md);
      display: flex; flex-direction: column; gap: 3px;
    }
    .mensaje.enviado {
      align-self: flex-end; background: var(--brand);
      color: var(--ink-inverse); border: 1px solid var(--brand);
      box-shadow: var(--shadow-brand-sm);
    }
    .mensaje.recibido {
      align-self: flex-start; background: var(--surface);
      color: var(--ink); border: 1px solid var(--border);
    }
    .autor {
      font-family: var(--font-mono); font-size: 10px; font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75;
    }
    .contenido {
      margin: 0; font-size: 13.5px; line-height: 1.45;
      white-space: pre-wrap; word-break: break-word;
    }
    .hora {
      font-family: var(--font-mono); font-size: 10px;
      letter-spacing: 0.04em; opacity: 0.6; align-self: flex-end;
    }
    .input-area { display: flex; gap: 10px; align-items: flex-end; }
    .input-area textarea {
      flex: 1; resize: none; padding: 11px 13px;
      background: var(--surface-muted); border: 1px solid var(--border);
      border-radius: var(--radius-md); font-size: 13.5px;
      color: var(--ink); font-family: inherit;
      box-shadow: inset 0 1px 0 rgba(0,0,0,0.2);
    }
    .input-area textarea::placeholder { color: var(--ink-faint); }
    .input-area textarea:focus {
      outline: none; border-color: var(--brand);
      box-shadow: 0 0 0 1px var(--brand), 0 0 0 4px rgba(245,180,0,0.16), inset 0 1px 0 rgba(0,0,0,0.2);
    }
    .input-area button {
      padding: 11px 20px; background: var(--brand);
      color: var(--ink-inverse); border: 1px solid var(--brand);
      border-radius: var(--radius-md); cursor: pointer;
      font-size: 13px; font-weight: 600; font-family: inherit;
      box-shadow: var(--shadow-brand-sm), inset 0 1px 0 rgba(255,255,255,0.22);
      transition: background 140ms, box-shadow 140ms;
    }
    .input-area button:hover:not(:disabled) {
      background: var(--brand-bright); border-color: var(--brand-bright);
    }
    .input-area button:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class MensajesComponent implements OnInit, OnDestroy {
  idIncidente = 0;
  mensajes: Mensaje[] = [];
  nuevoMensaje = '';
  cargando = false;
  enviando = false;
  error: string | null = null;

  private _pollSub?: Subscription;

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private http: HttpService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  volver(): void {
    this.router.navigate(['/dashboard/taller/solicitudes']);
  }

  ngOnInit(): void {
    this.idIncidente = Number(this.route.snapshot.paramMap.get('idIncidente') ?? 0);
    if (this.idIncidente) {
      this.cargar();
      // Polling cada 10 segundos para nuevos mensajes
      this._pollSub = interval(10_000)
        .pipe(switchMap(() => this.http.get<Mensaje[]>(`/mensajes/${this.idIncidente}/taller`)))
        .subscribe({ next: (data) => { this.mensajes = data; this.cdr.detectChanges(); } });
    }
  }

  ngOnDestroy(): void {
    this._pollSub?.unsubscribe();
  }

  cargar(): void {
    this.cargando = true;
    this.http.get<Mensaje[]>(`/mensajes/${this.idIncidente}/taller`).subscribe({
      next: (data) => {
        this.mensajes = data;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'Error al cargar mensajes';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  enviar(): void {
    const contenido = this.nuevoMensaje.trim();
    if (!contenido || this.enviando) return;

    this.enviando = true;
    this.http
      .post<Mensaje>(`/mensajes/${this.idIncidente}/taller`, { contenido })
      .subscribe({
        next: (nuevo) => {
          this.mensajes.push(nuevo);
          this.nuevoMensaje = '';
          this.enviando = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.detail ?? 'Error al enviar mensaje';
          this.enviando = false;
          this.cdr.detectChanges();
        },
      });
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;

    keyboardEvent.preventDefault();
    this.enviar();
  }
}
