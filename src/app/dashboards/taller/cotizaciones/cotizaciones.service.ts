import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface Cotizacion {
  id_cotizacion: number;
  id_incidente: number;
  id_taller: number;
  monto_servicio?: number;
  monto_repuestos?: number;
  garantia_dias?: number;
  tiempo_estimado_min?: number;
  nota?: string;
  validez_hasta?: string;
  created_at: string;
  estado?: { id_estado_cotizacion: number; nombre: string };
}

export interface ResponderRequest {
  monto_servicio: number;
  monto_repuestos: number;
  garantia_dias?: number;
  tiempo_estimado_min?: number;
  nota?: string;
}

@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private http = inject(HttpService);

  bandeja(estado: string = 'pendiente'): Observable<Cotizacion[]> {
    return this.http.get<Cotizacion[]>(`/talleres/mi-taller/cotizaciones?estado=${estado}`);
  }

  responder(idCotizacion: number, body: ResponderRequest): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`/cotizaciones/${idCotizacion}/responder`, body);
  }
}
