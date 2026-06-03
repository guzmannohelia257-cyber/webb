import { Component, OnInit, OnDestroy, AfterViewInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AsignacionesService } from '../../../shared/services/asignaciones.service';
import { TallerService, Tecnico } from '../../../shared/services/taller.service';
import { AsignacionTaller, EstadoNombre, AceptarAsignacionBody, CotizacionEstimada } from '../../../shared/models/asignacion.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-solicitud-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitud-detalle.component.html',
  styleUrl: './solicitud-detalle.component.scss'
})
export class SolicitudDetalleComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  asignacion = signal<AsignacionTaller | null>(null);
  cargando = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  mostrarModalAceptar = signal(false);
  mostrarModalRechazar = signal(false);
  mostrarMapa = signal(false);

  tecnicos = signal<Tecnico[]>([]);
  cargandoTecnicos = signal(false);

  // Lista completa de tecnicos (sin filtrar por disponible) para resolver el asignado.
  todosTecnicos = signal<Tecnico[]>([]);
  cotizacion = signal<CotizacionEstimada | null>(null);

  map: L.Map | null = null;
  private tecnicoMarker: L.Marker | null = null;
  private rutaLayer: L.Polyline | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;

  formAceptar: FormGroup;
  formRechazar: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private asignacionesService: AsignacionesService,
    private tallerService: TallerService,
    private fb: FormBuilder
  ) {
    this.formAceptar = this.fb.group({
      id_usuario: [null, [Validators.required]],
      nota: ['']
    });
    this.formRechazar = this.fb.group({
      motivo: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    console.log('[SolicitudDetalle] ngOnInit →', { id });
    if (id) {
      this.cargarAsignacion(id);
    } else {
      console.warn('[SolicitudDetalle] ngOnInit: id inválido en la ruta');
    }
  }

  ngAfterViewInit(): void {
    // El mapa se inicializa cuando el usuario lo pide con mostrarMapa()
  }

  ngOnDestroy(): void {
    this.destruirMapa();
  }

  cargarAsignacion(id: number): void {
    console.log('[SolicitudDetalle] cargarAsignacion →', { id });
    this.cargando.set(true);
    this.error.set(null);

    this.asignacionesService.obtener(id).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] cargarAsignacion ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.cargando.set(false);
        this.cargarExtras(data);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] cargarAsignacion ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar la asignación');
        this.cargando.set(false);
      }
    });
  }

  abrirModalAceptar(): void {
    this.error.set(null);
    this.mostrarModalAceptar.set(true);
    this.cargarTecnicos();
  }

  cargarTecnicos(): void {
    console.log('[SolicitudDetalle] cargarTecnicos →');
    this.cargandoTecnicos.set(true);
    this.tallerService.obtenerTecnicos().subscribe({
      next: (data) => {
        const disponibles = data.filter(t => t.disponible && t.activo);
        console.log('[SolicitudDetalle] cargarTecnicos ← OK', {
          total: data.length,
          disponibles: disponibles.length
        });
        this.tecnicos.set(disponibles);
        this.cargandoTecnicos.set(false);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] cargarTecnicos ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al cargar técnicos');
        this.cargandoTecnicos.set(false);
      }
    });
  }

  private cargarExtras(data: AsignacionTaller): void {
    // Cotizacion que vio el cliente (base de reparacion + traslado). Las
    // evidencias ya vienen embebidas en data.incidente.evidencias.
    this.asignacionesService.getCotizacionEstimada(data.id_asignacion).subscribe({
      next: (c) => this.cotizacion.set(c),
      error: () => this.cotizacion.set(null),
    });
    // Lista completa de tecnicos para resolver el asignado (puede no estar disponible).
    if (data.id_usuario) {
      this.tallerService.obtenerTecnicos().subscribe({
        next: (tec) => this.todosTecnicos.set(tec ?? []),
        error: () => this.todosTecnicos.set([]),
      });
    }
  }

  tecnicoAsignado(): Tecnico | null {
    const asig = this.asignacion();
    if (!asig?.id_usuario) return null;
    return this.todosTecnicos().find(t => t.id_usuario === asig.id_usuario) ?? null;
  }

  esImagen(url: string): boolean {
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
  }

  esAudio(url: string): boolean {
    return /\.(mp3|wav|ogg|m4a|aac|webm)(\?|$)/i.test(url);
  }

  abrirModalRechazar(): void {
    this.error.set(null);
    this.mostrarModalRechazar.set(true);
  }

  cerrarModales(): void {
    this.mostrarModalAceptar.set(false);
    this.mostrarModalRechazar.set(false);
  }

  confirmarAceptar(): void {
    if (this.formAceptar.invalid) {
      console.warn('[SolicitudDetalle] confirmarAceptar: formulario inválido', this.formAceptar.value);
      return;
    }
    const asig = this.asignacion();
    if (!asig) {
      console.warn('[SolicitudDetalle] confirmarAceptar: sin asignación cargada');
      return;
    }

    this.procesando.set(true);
    const valores = this.formAceptar.value;
    const body: AceptarAsignacionBody = {
      id_usuario: Number(valores.id_usuario),
    };
    if (valores.nota && valores.nota.trim()) {
      body.nota = valores.nota.trim();
    }

    console.log('[SolicitudDetalle] confirmarAceptar →', { id: asig.id_asignacion, body });

    this.asignacionesService.aceptar(asig.id_asignacion, body).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] confirmarAceptar ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.exito.set('✅ Solicitud aceptada correctamente');
        this.procesando.set(false);
        this.cerrarModales();
        setTimeout(() => this.exito.set(null), 3000);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] confirmarAceptar ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al aceptar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  confirmarRechazar(): void {
    if (this.formRechazar.invalid) {
      console.warn('[SolicitudDetalle] confirmarRechazar: formulario inválido', this.formRechazar.value);
      return;
    }
    const asig = this.asignacion();
    if (!asig) {
      console.warn('[SolicitudDetalle] confirmarRechazar: sin asignación cargada');
      return;
    }

    this.procesando.set(true);
    const motivo = this.formRechazar.value.motivo.trim();

    console.log('[SolicitudDetalle] confirmarRechazar →', { id: asig.id_asignacion, motivo });

    this.asignacionesService.rechazar(asig.id_asignacion, { motivo }).subscribe({
      next: (data) => {
        console.log('[SolicitudDetalle] confirmarRechazar ← OK', { estado: data.estado.nombre });
        this.asignacion.set(data);
        this.exito.set('❌ Solicitud rechazada');
        this.procesando.set(false);
        this.cerrarModales();
        setTimeout(() => this.exito.set(null), 3000);
      },
      error: (err) => {
        console.error('[SolicitudDetalle] confirmarRechazar ← ERROR', err);
        this.error.set(err?.error?.detail || err?.message || 'Error al rechazar la solicitud');
        this.procesando.set(false);
      }
    });
  }

  abrirGoogleMaps(): void {
    const asig = this.asignacion();
    if (!asig) return;
    const { latitud, longitud } = asig.incidente;
    window.open(`https://www.google.com/maps?q=${latitud},${longitud}`, '_blank');
  }

  toggleMapa(): void {
    const mostrar = !this.mostrarMapa();
    this.mostrarMapa.set(mostrar);
    if (mostrar) {
      // Asegurar la lista completa de técnicos para ubicar al asignado en el mapa.
      if (this.todosTecnicos().length === 0 && this.asignacion()?.id_usuario) {
        this.tallerService.obtenerTecnicos().subscribe({
          next: (t) => this.todosTecnicos.set(t ?? []),
          error: () => {},
        });
      }
      setTimeout(() => this.inicializarMapa(), 100);
    } else {
      this.destruirMapa();
    }
  }

  inicializarMapa(): void {
    if (this.map || !this.mapContainer?.nativeElement) return;
    
    const asig = this.asignacion();
    if (!asig) return;

    const clienteLat = asig.incidente.latitud;
    const clienteLng = asig.incidente.longitud;
    const container = this.mapContainer.nativeElement;

    // Crear el mapa (centrado en el cliente)
    this.map = L.map(container).setView([clienteLat, clienteLng], 15);

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 1
    }).addTo(this.map);

    // Marcador 1: cliente (ubicación del incidente)
    const iconCliente = L.icon({
      iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    L.marker([clienteLat, clienteLng], {
      icon: iconCliente,
      title: `Cliente: ${asig.incidente.usuario.nombre}`
    })
      .addTo(this.map)
      .bindPopup(`
        <div class="map-popup">
          <strong style="color: red;">📍 CLIENTE</strong><br/>
          <strong>${asig.incidente.usuario.nombre}</strong><br/>
          ${clienteLat.toFixed(4)}, ${clienteLng.toFixed(4)}<br/>
          <small>Ubicación del incidente</small>
        </div>
      `);

    // Marcador del técnico asignado + ruta OSRM (con refresco en vivo si va en camino).
    this.pintarTecnicoYRuta();
    if (asig.estado.nombre === 'en_camino') {
      this.iniciarPollingTecnico();
    }

    this.map.invalidateSize();
  }

  private iconoTecnico(): L.Icon {
    return L.icon({
      iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="orange"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  }

  // Coloca/actualiza el marcador del técnico asignado y (re)dibuja la ruta OSRM.
  private pintarTecnicoYRuta(): void {
    const asig = this.asignacion();
    if (!asig || !this.map || !asig.id_usuario) return;
    const tec = this.todosTecnicos().find(t => t.id_usuario === asig.id_usuario);
    if (!tec || tec.latitud == null || tec.longitud == null) return;

    const tecLat = tec.latitud;
    const tecLng = tec.longitud;

    if (this.tecnicoMarker) {
      this.tecnicoMarker.setLatLng([tecLat, tecLng]);
    } else {
      this.tecnicoMarker = L.marker([tecLat, tecLng], {
        icon: this.iconoTecnico(),
        title: `Técnico: ${tec.nombre}`,
      })
        .addTo(this.map)
        .bindPopup(`<div class="map-popup"><strong style="color: orange;">🔧 TÉCNICO</strong><br/><strong>${tec.nombre}</strong><br/><small>Ubicación actual</small></div>`);
    }

    this.dibujarRutaOSRM(tecLat, tecLng, asig.incidente.latitud, asig.incidente.longitud);
  }

  // Ruta óptima por calles (OSRM). Fallback a línea recta punteada si falla.
  private async dibujarRutaOSRM(tecLat: number, tecLng: number, cliLat: number, cliLng: number): Promise<void> {
    let puntos: L.LatLngExpression[] = [[tecLat, tecLng], [cliLat, cliLng]];
    let punteada = true;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${tecLng},${tecLat};${cliLng},${cliLat}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      if (resp.ok) {
        const j: any = await resp.json();
        const coords = j?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length) {
          puntos = coords.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression);
          punteada = false;
        }
      }
    } catch {
      // Sin conexión a OSRM: queda la línea recta punteada.
    }

    if (!this.map) return;
    if (this.rutaLayer) {
      this.rutaLayer.remove();
      this.rutaLayer = null;
    }
    this.rutaLayer = L.polyline(puntos, {
      color: '#e67e22',
      weight: 4,
      opacity: 0.85,
      dashArray: punteada ? '8, 8' : undefined,
    }).addTo(this.map);
    this.map.fitBounds(L.latLngBounds(puntos).pad(0.2), { padding: [40, 40] });
  }

  private iniciarPollingTecnico(): void {
    if (this.pollId) return;
    this.pollId = setInterval(() => this.actualizarPosTecnico(), 10000);
  }

  private actualizarPosTecnico(): void {
    if (!this.map || this.asignacion()?.estado.nombre !== 'en_camino') return;
    this.tallerService.obtenerTecnicos().subscribe({
      next: (tec) => {
        this.todosTecnicos.set(tec ?? []);
        this.pintarTecnicoYRuta();
      },
      error: () => {},
    });
  }

  private destruirMapa(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
    this.tecnicoMarker = null;
    this.rutaLayer = null;
  }

  llamarCliente(): void {
    const tel = this.asignacion()?.incidente.usuario.telefono;
    if (tel) {
      window.location.href = `tel:${tel}`;
    }
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/solicitudes']);
  }

  etiquetaEstado(estado: EstadoNombre): string {
    const map: Record<EstadoNombre, string> = {
      pendiente: '⏳ Pendiente',
      aceptada: '✅ Aceptada',
      en_camino: '🚚 En camino',
      llegado: '📍 Llegado',
      completada: '🏁 Completada',
      rechazada: '❌ Rechazada'
    };
    return map[estado] ?? estado;
  }
}
