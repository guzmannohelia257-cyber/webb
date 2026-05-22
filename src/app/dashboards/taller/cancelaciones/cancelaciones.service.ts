import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface AsignacionCancelada {
  id_asignacion: number;
  id_incidente: number;
  cancelada_at?: string;
  cancelada_por?: string;
  motivo_cancelacion?: string;
  compensacion_monto?: number;
  compensacion_pagada: boolean;
}

@Injectable({ providedIn: 'root' })
export class CancelacionesService {
  private http = inject(HttpService);

  misCanceladas(): Observable<AsignacionCancelada[]> {
    return this.http.get<AsignacionCancelada[]>('/talleres/mi-taller/asignaciones?estado=cancelada');
  }

  actualizarTarifa(tarifa: number): Observable<unknown> {
    return this.http.patch('/talleres/mi-taller/tarifa-traslado', { tarifa_traslado: tarifa });
  }

  miTaller(): Observable<{ tarifa_traslado: number }> {
    return this.http.get<{ tarifa_traslado: number }>('/talleres/mi-taller');
  }
}
