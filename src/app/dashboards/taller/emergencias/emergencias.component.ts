import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RealtimeService, WSEvent } from '../../../shared/services/realtime.service';
import { EmergenciasService } from './emergencias.service';

interface EmergenciaLive {
  id_incidente: number;
  id_categoria?: number;
  latitud: number;
  longitud: number;
  descripcion_usuario?: string;
  resumen_ia?: string;
  created_at: string;

  tomado?: boolean;
  aceptando?: boolean;
  mio?: boolean;
  error?: string;
}

@Component({
  selector: 'app-emergencias',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './emergencias.component.html',
  styleUrls: ['./emergencias.component.scss'],
})
export class EmergenciasComponent implements OnInit, OnDestroy {
  private rt = inject(RealtimeService);
  private svc = inject(EmergenciasService);
  private router = inject(Router);

  emergencias = signal<EmergenciaLive[]>([]);
  private sub?: Subscription;

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  ngOnInit(): void {
    this.sub = this.rt.events$.subscribe(evt => this.handleEvent(evt));
  }

  private handleEvent(evt: WSEvent): void {
    if (evt.event === 'incidente.nuevo') {
      const e: EmergenciaLive = { ...(evt.data as EmergenciaLive) };
      this.emergencias.update(arr => {
        if (arr.some(x => x.id_incidente === e.id_incidente)) return arr;
        return [e, ...arr];
      });
      return;
    }

    if (evt.event === 'incidente.tomado') {
      const idIncidente = (evt.data as { id_incidente: number }).id_incidente;
      this.emergencias.update(arr =>
        arr.map(e => (e.id_incidente === idIncidente ? { ...e, tomado: true } : e))
      );
      return;
    }

    if (evt.event === 'incidente.asignado') {
      const idIncidente = (evt.data as { id_incidente: number }).id_incidente;
      this.emergencias.update(arr =>
        arr.map(e =>
          e.id_incidente === idIncidente
            ? { ...e, mio: true, aceptando: false }
            : e
        )
      );
    }
  }

  aceptar(e: EmergenciaLive): void {
    e.aceptando = true;
    e.error = undefined;
    this.svc.aceptar(e.id_incidente).subscribe({
      next: () => {
        e.aceptando = false;
        e.mio = true;
      },
      error: (err) => {
        e.aceptando = false;
        if (err?.status === 409) {
          e.tomado = true;
        } else {
          e.error = err?.error?.detail ?? 'Error aceptando';
        }
      },
    });
  }

  abrirEnMaps(e: EmergenciaLive): void {
    window.open(`https://www.google.com/maps?q=${e.latitud},${e.longitud}`, '_blank');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
