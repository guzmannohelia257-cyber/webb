import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CotizacionesService, Cotizacion, ResponderRequest } from './cotizaciones.service';

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './cotizaciones.component.html',
  styleUrls: ['./cotizaciones.component.scss'],
})
export class CotizacionesComponent implements OnInit {
  private svc = inject(CotizacionesService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  bandeja: Cotizacion[] = [];
  filtroEstado: 'pendiente' | 'enviada' | 'aceptada' | 'rechazada' | 'expirada' = 'pendiente';
  cargando = true;
  errorCarga: string | null = null;

  cotEditando: Cotizacion | null = null;
  form: ResponderRequest = { monto_servicio: 0, monto_repuestos: 0 };
  guardando = false;
  errorForm: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = null;
    console.log('[Cotizaciones] cargar → estado:', this.filtroEstado);
    this.svc.bandeja(this.filtroEstado).subscribe({
      next: (data) => {
        console.log(`[Cotizaciones] cargar ← OK ${Array.isArray(data) ? data.length : '?'} items`);
        this.bandeja = Array.isArray(data) ? data : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('[Cotizaciones] cargar ← ERROR', { status: e?.status, detail: e?.error?.detail, message: e?.message });
        this.errorCarga = e?.error?.detail ?? e?.message ?? 'Error al cargar cotizaciones';
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  abrirResponder(cot: Cotizacion): void {
    this.cotEditando = cot;
    this.form = {
      monto_servicio: cot.monto_servicio ?? 0,
      monto_repuestos: cot.monto_repuestos ?? 0,
      garantia_dias: cot.garantia_dias,
      nota: cot.nota,
    };
    this.errorForm = null;
  }

  cancelarEdicion(): void {
    this.cotEditando = null;
  }

  enviarRespuesta(): void {
    if (!this.cotEditando) return;
    if (this.form.monto_servicio < 0 || this.form.monto_repuestos < 0) {
      this.errorForm = 'Los montos no pueden ser negativos';
      return;
    }

    this.guardando = true;
    this.svc.responder(this.cotEditando.id_cotizacion, this.form).subscribe({
      next: () => {
        this.guardando = false;
        this.cotEditando = null;
        this.cargar();
      },
      error: (e) => {
        this.errorForm = e?.error?.detail ?? e?.message ?? 'Error enviando respuesta';
        this.guardando = false;
      },
    });
  }

  esExpirada(cot: Cotizacion): boolean {
    if (!cot.validez_hasta) return false;
    return new Date(cot.validez_hasta) < new Date();
  }
}
