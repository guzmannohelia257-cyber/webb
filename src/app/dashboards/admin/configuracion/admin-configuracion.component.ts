import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, ConfiguracionGlobal } from '../../../shared/services/admin.service';
import { notificacion } from '../../../shared/utils/notificacion.util';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-configuracion.component.html',
  styleUrl: './admin-configuracion.component.scss'
})
export class AdminConfiguracionComponent implements OnInit, OnDestroy {
  config: ConfiguracionGlobal = {
    sla_penalizacion_pct: 0,
    sla_tolerancia_min: 0,
  };

  cargando = false;
  guardando = false;

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.adminService.getConfiguracion()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.cargando = false; this.cdr.markForCheck(); })
      )
      .subscribe({
        next: (cfg) => {
          this.config = {
            sla_penalizacion_pct: cfg.sla_penalizacion_pct ?? 0,
            sla_tolerancia_min: cfg.sla_tolerancia_min ?? 0,
          };
          this.cdr.markForCheck();
        },
        error: () => notificacion('Error al cargar la configuracion', 'error'),
      });
  }

  guardar(): void {
    const pct = Number(this.config.sla_penalizacion_pct);
    const min = Number(this.config.sla_tolerancia_min);

    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      notificacion('El porcentaje debe estar entre 0 y 100', 'warning');
      return;
    }
    if (!Number.isFinite(min) || min < 0 || min > 600) {
      notificacion('La tolerancia debe estar entre 0 y 600 minutos', 'warning');
      return;
    }

    this.guardando = true;
    const body: ConfiguracionGlobal = {
      sla_penalizacion_pct: pct,
      sla_tolerancia_min: min,
    };

    this.adminService.actualizarConfiguracion(body)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.guardando = false; this.cdr.markForCheck(); })
      )
      .subscribe({
        next: (cfg) => {
          this.config = {
            sla_penalizacion_pct: cfg.sla_penalizacion_pct ?? 0,
            sla_tolerancia_min: cfg.sla_tolerancia_min ?? 0,
          };
          notificacion('Configuracion actualizada', 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = err?.error?.detail ?? 'Error al guardar la configuracion';
          notificacion(msg, 'error');
        },
      });
  }
}
