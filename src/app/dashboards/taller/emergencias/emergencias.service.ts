import { Injectable, inject } from '@angular/core';
import { HttpService } from '../../../shared/services/http.service';

@Injectable({ providedIn: 'root' })
export class EmergenciasService {
  private http = inject(HttpService);

  aceptar(idIncidente: number) {
    return this.http.post<{ id_asignacion: number; id_taller: number; nuevo_estado: string }>(
      `/incidentes/${idIncidente}/aceptar`,
      {}
    );
  }
}
