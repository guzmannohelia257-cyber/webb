import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from '../../../shared/services/http.service';

export interface Categoria {
  id_categoria: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiere_cotizacion: boolean;
  icono_url?: string;
}

export interface TallerServicio {
  id_taller_servicio?: number;
  id_taller?: number;
  id_categoria: number;
  servicio_movil: boolean;
  tarifa_base?: number;
}

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpService);

  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>('/categorias');
  }

  listarMisServicios(): Observable<TallerServicio[]> {
    return this.http.get<TallerServicio[]>('/talleres/mi-taller/servicios');
  }

  guardarServicios(servicios: TallerServicio[]): Observable<TallerServicio[]> {
    return this.http.put<TallerServicio[]>('/talleres/mi-taller/servicios', { servicios });
  }
}
