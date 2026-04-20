import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from './http.service';

export interface Taller {
  id_taller: number;
  id_gerente: number;
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  descripcion: string;
  verificado: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tecnico {
  id_tecnico: number;
  id_taller: number;
  nombre: string;
  telefono: string;
  disponible: boolean;
  activo: boolean;
  latitud: number | null;
  longitud: number | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class TallerService {

  constructor(private http: HttpService) {}

  /**
   * Obtiene información del taller del gerente autenticado
   */
  obtenerMiTaller(): Observable<Taller> {
    return this.http.get<Taller>('/talleres/mi-taller');
  }

  /**
   * Actualiza información del taller
   */
  actualizarMiTaller(datos: Partial<Taller>): Observable<Taller> {
    return this.http.put<Taller>('/talleres/mi-taller', datos);
  }

  /**
   * Obtiene lista de técnicos del taller
   */
  obtenerTecnicos(): Observable<Tecnico[]> {
    return this.http.get<Tecnico[]>('/talleres/mi-taller/tecnicos');
  }

  /**
   * Obtiene detalles de un técnico específico
   */
  obtenerTecnico(tecnicoId: number): Observable<Tecnico> {
    return this.http.get<Tecnico>(`/talleres/mi-taller/tecnicos/${tecnicoId}`);
  }

  /**
   * Actualiza información de un técnico
   */
  actualizarTecnico(tecnicoId: number, datos: Partial<Tecnico>): Observable<Tecnico> {
    return this.http.put<Tecnico>(`/talleres/mi-taller/tecnicos/${tecnicoId}`, datos);
  }

  /**
   * Agrega un nuevo técnico al taller
   */
  agregarTecnico(datos: any): Observable<Tecnico> {
    return this.http.post<Tecnico>('/talleres/mi-taller/tecnicos', datos);
  }

  /**
   * Desactiva un técnico del taller
   */
  removerTecnico(tecnicoId: number): Observable<any> {
    return this.http.delete<any>(`/talleres/mi-taller/tecnicos/${tecnicoId}`);
  }
}
