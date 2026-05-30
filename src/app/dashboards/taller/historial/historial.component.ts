import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpService } from '../../../shared/services/http.service';
import { AsignacionTaller } from '../../../shared/models/asignacion.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="historial-container">
      <div class="historial-header">
        <div style="display:flex;align-items:center;gap:14px">
          <button (click)="volver()" class="btn-back">← Volver</button>
          <h2 style="margin:0">Historial de atenciones</h2>
        </div>
        <div class="filtros">
          <label>
            Desde:
            <input type="date" [(ngModel)]="filtroDesde" (change)="cargar()" />
          </label>
          <label>
            Hasta:
            <input type="date" [(ngModel)]="filtroHasta" (change)="cargar()" />
          </label>
        </div>
      </div>

      <div *ngIf="cargando" class="loading">Cargando historial...</div>
      <div *ngIf="error" class="error-msg">{{ error }}</div>

      <div *ngIf="!cargando && !error">
        <p class="total-text">
          {{ atenciones.length }} atenciones completadas
        </p>

        <div *ngIf="atenciones.length === 0" class="empty">
          No hay atenciones completadas en el período seleccionado.
        </div>

        <table *ngIf="atenciones.length > 0" class="tabla-historial">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Vehículo</th>
              <th>Categoría</th>
              <th>Técnico</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of atenciones">
              <td>{{ a.id_asignacion }}</td>
              <td>{{ a.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>{{ a.incidente.usuario.nombre }}</td>
              <td>{{ vehiculoLabel(a) }}</td>
              <td>{{ a.incidente.categoria?.nombre ?? '—' }}</td>
              <td>{{ a.id_usuario ?? '—' }}</td>
              <td>
                <span class="badge completada">{{ a.estado.nombre }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="paginacion" *ngIf="totalPaginas > 1">
          <button (click)="cambiarPagina(paginaActual - 1)" [disabled]="paginaActual === 1">
            &#8592; Anterior
          </button>
          <span>Página {{ paginaActual }} / {{ totalPaginas }}</span>
          <button (click)="cambiarPagina(paginaActual + 1)" [disabled]="paginaActual === totalPaginas">
            Siguiente &#8594;
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .historial-container { padding: 28px 28px 64px; max-width: var(--container-max); margin: 0 auto; }
    .historial-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 22px; padding-bottom: 18px; flex-wrap: wrap; gap: 14px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .historial-header h2 {
      margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.028em;
      color: var(--ink);
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
    .filtros { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
    .filtros label {
      display: flex; flex-direction: column; gap: 5px;
      font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--ink-muted);
    }
    .filtros input {
      padding: 7px 10px; background: var(--surface-muted);
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      color: var(--ink); font-family: var(--font-mono); font-size: 12px;
      color-scheme: dark;
    }
    .filtros input:focus {
      outline: none; border-color: var(--brand);
      box-shadow: 0 0 0 1px var(--brand), 0 0 0 4px rgba(245, 180, 0, 0.16);
    }
    .loading, .error-msg, .empty {
      text-align: center; padding: 44px; color: var(--ink-muted);
      background: var(--surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg); font-size: 13px;
    }
    .empty { border-style: dashed; border-color: var(--border-strong); }
    .error-msg { color: var(--danger-ink); background: var(--danger-soft); border-color: rgba(244,63,94,0.3); }
    .total-text {
      color: var(--ink-muted); font-family: var(--font-mono); font-size: 11px;
      letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 14px;
    }
    .tabla-historial {
      width: 100%; border-collapse: collapse; font-size: 13px;
      background: var(--surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg); overflow: hidden;
    }
    .tabla-historial th, .tabla-historial td {
      padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); text-align: left;
    }
    .tabla-historial thead { background: var(--surface-muted); }
    .tabla-historial th {
      font-family: var(--font-mono); font-size: 10.5px; font-weight: 500;
      letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted);
    }
    .tabla-historial tbody td { color: var(--ink-subtle); }
    .tabla-historial tbody tr:hover td { background: var(--overlay); }
    .tabla-historial tbody tr:last-child td { border-bottom: 0; }
    .badge {
      display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px;
      border-radius: var(--radius-xs); font-family: var(--font-mono);
      font-size: 10.5px; font-weight: 500; letter-spacing: 0.06em;
      text-transform: uppercase; border: 1px solid;
    }
    .badge.completada {
      background: var(--success-soft); color: var(--success-ink);
      border-color: rgba(16, 185, 129, 0.32);
    }
    .paginacion {
      display: flex; justify-content: center; align-items: center; gap: 14px;
      margin-top: 22px; font-family: var(--font-mono); font-size: 12px;
      color: var(--ink-muted); letter-spacing: 0.04em;
    }
    .paginacion button {
      padding: 7px 14px; border: 1px solid var(--border); background: var(--surface);
      border-radius: var(--radius-md); cursor: pointer;
      color: var(--ink); font-family: inherit; font-size: 12px;
      transition: background 140ms, border-color 140ms;
    }
    .paginacion button:hover:not(:disabled) {
      background: var(--surface-raised); border-color: var(--border-strong);
    }
    .paginacion button:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class HistorialComponent implements OnInit {
  atenciones: AsignacionTaller[] = [];
  cargando = false;
  error: string | null = null;
  paginaActual = 1;
  porPagina = 20;
  totalPaginas = 1;
  filtroDesde = '';
  filtroHasta = '';

  constructor(
    private http: HttpService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  ngOnInit(): void {
    console.log('[Historial] ngOnInit → cargar historial inicial');
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    let url = `/talleres/mi-taller/historial?pagina=${this.paginaActual}&por_pagina=${this.porPagina}`;
    if (this.filtroDesde) url += `&desde=${this.filtroDesde}`;
    if (this.filtroHasta) url += `&hasta=${this.filtroHasta}`;

    console.log('[Historial] cargar →', {
      pagina: this.paginaActual,
      porPagina: this.porPagina,
      filtroDesde: this.filtroDesde || null,
      filtroHasta: this.filtroHasta || null,
      url,
    });

    this.http.get<AsignacionTaller[]>(url).pipe(
      finalize(() => {
        this.cargando = false;
        console.log('[Historial] cargar → finalize');
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (data) => {
        this.atenciones = data;
        console.log('[Historial] cargar ← OK', {
          count: data.length,
          firstId: data[0]?.id_asignacion ?? null,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.detail ?? 'Error al cargar el historial';
        console.error('[Historial] cargar ← ERROR', {
          status: err?.status ?? null,
          detail: err?.error?.detail ?? err?.message ?? err,
        });
        this.cdr.detectChanges();
      },
    });
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1) return;
    console.log('[Historial] cambiarPagina →', { paginaAnterior: this.paginaActual, paginaNueva: pagina });
    this.paginaActual = pagina;
    this.cargar();
  }

  vehiculoLabel(a: AsignacionTaller): string {
    const v = (a as any).incidente?.vehiculo;
    if (!v) return '—';
    return [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || v.placa;
  }
}
