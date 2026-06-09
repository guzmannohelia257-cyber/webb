import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as L from 'leaflet';

/** Respuesta del endpoint público GET /public/track/{token} (sanitizada). */
interface TrackData {
  estado: string;
  tecnico: {
    nombre?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    actualizado_at?: string | null;
  };
  cliente: { nombre?: string | null; latitud: number; longitud: number };
  eta?: { distancia_km?: number | null; eta_minutos?: number | null } | null;
}

type Fase = 'cargando' | 'ok' | 'invalid' | 'finished' | 'error';

@Component({
  selector: 'app-public-track',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="track-page">
      <header class="track-header">
        <span class="brand">📡 Seguimiento en vivo</span>
        @if (fase() === 'ok' && data()) {
          <span class="estado">{{ etiquetaEstado(data()!.estado) }}</span>
        }
      </header>

      @if (fase() === 'cargando') {
        <div class="track-msg">Cargando seguimiento…</div>
      }
      @if (fase() === 'invalid') {
        <div class="track-msg error">Este enlace no es válido.</div>
      }
      @if (fase() === 'finished') {
        <div class="track-msg">El seguimiento de este servicio ya finalizó.</div>
      }
      @if (fase() === 'error') {
        <div class="track-msg error">No se pudo conectar. Reintentando…</div>
      }

      <div class="map" #mapEl [class.hidden]="fase() !== 'ok'"></div>

      @if (fase() === 'ok' && data()) {
        <div class="track-info">
          <div class="info-row">
            <span class="dot cliente"></span>
            <span>Cliente: {{ data()!.cliente.nombre || 'Cliente' }}</span>
          </div>
          <div class="info-row">
            <span class="dot tecnico"></span>
            <span>Técnico: {{ data()!.tecnico.nombre || 'Técnico' }}</span>
          </div>
          @if (data()!.eta?.eta_minutos != null) {
            <div class="info-row eta">
              ⏱️ Llega en ~{{ data()!.eta!.eta_minutos }} min
              @if (data()!.eta?.distancia_km != null) {
                <span class="muted">({{ data()!.eta!.distancia_km }} km)</span>
              }
            </div>
          }
          @if (data()!.tecnico.latitud == null) {
            <div class="info-row muted">El técnico aún no comparte su ubicación.</div>
          }
          @if (ultimaActualizacion()) {
            <div class="info-row muted small">Última actualización: {{ ultimaActualizacion() }}</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; background: #f4f5f7; }
    .track-page { display: flex; flex-direction: column; height: 100%; }
    .track-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; background: #1f2937; color: #fff; font-weight: 600;
    }
    .track-header .estado { font-size: 0.85rem; background: #374151; padding: 4px 10px; border-radius: 999px; }
    .track-msg { padding: 24px 16px; text-align: center; color: #444; }
    .track-msg.error { color: #c0392b; }
    .map { flex: 1; width: 100%; min-height: 0; }
    .map.hidden { display: none; }
    .track-info {
      padding: 12px 16px; background: #fff; border-top: 1px solid #e5e7eb;
      display: flex; flex-direction: column; gap: 6px;
    }
    .info-row { display: flex; align-items: center; gap: 8px; color: #333; }
    .info-row.eta { font-weight: 600; }
    .info-row .muted, .info-row.muted { color: #888; }
    .info-row.small { font-size: 0.8rem; }
    .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .dot.cliente { background: red; }
    .dot.tecnico { background: orange; }
    .muted { color: #888; font-weight: 400; }
  `]
})
export class PublicTrackComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: false }) mapEl!: ElementRef;

  fase = signal<Fase>('cargando');
  data = signal<TrackData | null>(null);
  ultimaActualizacion = signal<string | null>(null);

  private token = '';
  private map: L.Map | null = null;
  private clienteMarker: L.Marker | null = null;
  private tecnicoMarker: L.Marker | null = null;
  private rutaLayer: L.Polyline | null = null;
  private pollId: ReturnType<typeof setInterval> | null = null;
  private viewListo = false;

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) {
      this.fase.set('invalid');
      return;
    }
    this.cargar();
    this.pollId = setInterval(() => this.cargar(), 6000);
  }

  ngAfterViewInit(): void {
    this.viewListo = true;
    // Si los datos llegaron antes de que la vista estuviera lista, pintar ahora.
    if (this.data()) this.renderMapa();
  }

  ngOnDestroy(): void {
    if (this.pollId) clearInterval(this.pollId);
    this.destruirMapa();
  }

  private cargar(): void {
    const url = `${environment.apiUrl}/public/track/${this.token}`;
    this.http.get<TrackData>(url).subscribe({
      next: (d) => {
        this.data.set(d);
        this.fase.set('ok');
        if (d.tecnico.actualizado_at) {
          this.ultimaActualizacion.set(new Date(d.tecnico.actualizado_at).toLocaleTimeString());
        }
        this.renderMapa();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 410) {
          this.fase.set('finished');
          this.detenerPolling();
        } else if (err.status === 404) {
          this.fase.set('invalid');
          this.detenerPolling();
        } else if (!this.data()) {
          // Solo mostrar error si aún no se pintó nada; si ya hay mapa, se
          // mantiene el último estado conocido hasta el próximo intento.
          this.fase.set('error');
        }
      },
    });
  }

  private detenerPolling(): void {
    if (this.pollId) {
      clearInterval(this.pollId);
      this.pollId = null;
    }
  }

  // Crea el mapa la primera vez; en llamadas posteriores actualiza marcadores/ruta.
  private renderMapa(): void {
    const d = this.data();
    if (!d || !this.viewListo || !this.mapEl?.nativeElement) return;

    if (!this.map) {
      this.map = L.map(this.mapEl.nativeElement).setView(
        [d.cliente.latitud, d.cliente.longitud],
        15
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 1,
      }).addTo(this.map);
      setTimeout(() => this.map?.invalidateSize(), 0);
    }

    // Marcador del cliente (fijo).
    if (!this.clienteMarker) {
      this.clienteMarker = L.marker([d.cliente.latitud, d.cliente.longitud], {
        icon: this.icono('red'),
        title: `Cliente: ${d.cliente.nombre || ''}`,
      })
        .addTo(this.map)
        .bindPopup(`<strong style="color:red">📍 ${d.cliente.nombre || 'Cliente'}</strong>`);
    }

    // Marcador del técnico (si ya comparte ubicación) + ruta.
    if (d.tecnico.latitud != null && d.tecnico.longitud != null) {
      const tecLat = d.tecnico.latitud;
      const tecLng = d.tecnico.longitud;
      if (this.tecnicoMarker) {
        this.tecnicoMarker.setLatLng([tecLat, tecLng]);
      } else {
        this.tecnicoMarker = L.marker([tecLat, tecLng], {
          icon: this.icono('orange'),
          title: `Técnico: ${d.tecnico.nombre || ''}`,
        })
          .addTo(this.map)
          .bindPopup(`<strong style="color:orange">🔧 ${d.tecnico.nombre || 'Técnico'}</strong>`);
      }
      this.dibujarRutaOSRM(tecLat, tecLng, d.cliente.latitud, d.cliente.longitud);
    }
  }

  private icono(color: string): L.Icon {
    return L.icon({
      iconUrl: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 0C7.03 0 3 4.03 3 9c0 5.25 9 15 9 15s9-9.75 9-15c0-4.97-4.03-9-9-9zm0 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
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

  private destruirMapa(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
    }
    this.clienteMarker = null;
    this.tecnicoMarker = null;
    this.rutaLayer = null;
  }

  etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      pendiente: '⏳ Pendiente',
      aceptada: '✅ Aceptada',
      en_camino: '🚚 En camino',
      llegado: '📍 Llegado',
      completada: '🏁 Completada',
      rechazada: '❌ Rechazada',
    };
    return map[estado] ?? estado;
  }
}
