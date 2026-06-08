import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Botón de instalación de la PWA. Aparece en la barra superior y permite
 * instalar la aplicación como app independiente.
 *
 * - En navegadores Chromium (Chrome/Edge/Android) captura el evento
 *   `beforeinstallprompt` y lanza el diálogo nativo de instalación.
 * - En iOS/Safari (que no soporta ese evento) muestra las instrucciones
 *   manuales (Compartir → Agregar a pantalla de inicio).
 * - Se oculta solo si la app ya se está ejecutando instalada (standalone).
 *
 * Nota: el diálogo nativo solo se ofrece en producción servida por HTTPS,
 * donde el service worker (ngsw-worker.js) está activo.
 */
@Component({
  selector: 'app-install-pwa-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="pwa-install">
        <button
          type="button"
          class="pwa-install__btn"
          (click)="onClick()"
          title="Instalar aplicación"
          aria-label="Instalar aplicación">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="pwa-install__txt">Instalar</span>
        </button>

        @if (showHelp) {
          <div class="pwa-install__help">
            @if (isIOS) {
              <p>En iPhone/iPad: pulsa <strong>Compartir</strong> y luego
                 <strong>"Agregar a pantalla de inicio"</strong>.</p>
            } @else {
              <p>Abre el menú del navegador (⋮) y elige
                 <strong>"Instalar aplicación"</strong> o
                 <strong>"Agregar a pantalla de inicio"</strong>.</p>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .pwa-install { position: relative; display: inline-flex; }
    .pwa-install__btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 8px;
      border: 1px solid currentColor; background: transparent;
      color: inherit; font: inherit; font-size: 13px; font-weight: 600;
      cursor: pointer; opacity: .85; line-height: 1; transition: opacity .15s, background .15s;
    }
    .pwa-install__btn:hover { opacity: 1; background: rgba(127,127,127,.15); }
    .pwa-install__txt { white-space: nowrap; }
    .pwa-install__help {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 1000;
      width: 250px; padding: 10px 12px; border-radius: 10px;
      background: #ffffff; color: #1f2937;
      box-shadow: 0 10px 30px rgba(0,0,0,.18); border: 1px solid #e5e7eb;
      font-size: 12.5px; line-height: 1.45;
    }
    .pwa-install__help p { margin: 0; }
    @media (max-width: 640px) { .pwa-install__txt { display: none; } }
  `],
})
export class InstallPwaButtonComponent {
  /** Evento de instalación diferido (Chromium). */
  private deferred: any = null;
  visible = true;
  showHelp = false;
  isIOS = false;

  constructor() {
    if (typeof window === 'undefined') return;
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (standalone) this.visible = false; // ya instalada: no mostrar
    this.isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstall(e: Event): void {
    e.preventDefault();
    this.deferred = e; // guardamos para lanzarlo al hacer clic
  }

  @HostListener('window:appinstalled')
  onInstalled(): void {
    this.visible = false;
    this.deferred = null;
  }

  async onClick(): Promise<void> {
    if (this.deferred) {
      this.deferred.prompt();
      try { await this.deferred.userChoice; } catch { /* ignorado */ }
      this.deferred = null;
      return;
    }
    // Sin evento nativo (iOS u otros): mostrar instrucciones manuales.
    this.showHelp = !this.showHelp;
  }
}
