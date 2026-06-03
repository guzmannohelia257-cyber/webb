export type EstadoNombre = 'pendiente' | 'aceptada' | 'en_camino' | 'llegado' | 'completada' | 'rechazada';

export interface EstadoAsignacion {
  id_estado_asignacion: number;
  nombre: EstadoNombre;
}

export interface UsuarioCliente {
  id_usuario: number;
  nombre: string;
  telefono?: string;
}

export interface VehiculoAsignacion {
  id_vehiculo: number;
  placa: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  color?: string;
}

export interface CategoriaIncidente {
  id_categoria: number;
  nombre: string;
}

export interface PrioridadIncidente {
  id_prioridad: number;
  nivel: string;
  orden: number;
}

export interface IncidenteAsignacion {
  id_incidente: number;
  descripcion_usuario?: string;
  resumen_ia?: string;
  latitud: number;
  longitud: number;
  created_at: string;
  usuario: UsuarioCliente;
  vehiculo: VehiculoAsignacion;
  categoria?: CategoriaIncidente;
  prioridad?: PrioridadIncidente;
  evidencias?: EvidenciaItem[];
}

export interface AsignacionTaller {
  id_asignacion: number;
  id_incidente: number;
  id_taller: number;
  id_usuario: number | null;
  id_estado_asignacion: number;
  eta_minutos: number | null;
  costo_estimado?: number | null;
  costo_final?: number | null;
  nota_taller: string | null;
  created_at: string;
  updated_at: string;
  // Indica si el cliente ya pagó el servicio (solo relevante en estado 'completada').
  pagado?: boolean;
  estado: EstadoAsignacion;
  incidente: IncidenteAsignacion;
}

export interface AceptarAsignacionBody {
  id_usuario?: number;
  eta_minutos?: number;
  nota?: string;
}

export interface RechazarAsignacionBody {
  motivo: string;
}

export interface IniciarViajeRequest {
  latitud_tecnico?: number;
  longitud_tecnico?: number;
}

export interface CompletarAsignacionRequest {
  costo_estimado?: number;
  resumen_trabajo?: string;
}

export interface EvidenciaItem {
  id_evidencia?: number;
  id_tipo_evidencia: number;
  url_archivo: string;
  transcripcion_audio?: string | null;
  descripcion_ia?: string | null;
  created_at: string;
}

export interface CotizacionEstimada {
  base_reparacion: number;
  traslado: number;
  total: number;
  distancia_km: number | null;
  tiempo_reparacion_min: number | null;
  eta_minutos: number | null;
}

