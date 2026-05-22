import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ServiciosService, Categoria, TallerServicio } from './servicios.service';

interface FilaServicio {
  categoria: Categoria;
  activo: boolean;
  servicio_movil: boolean;
  tarifa_base: number | null;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './servicios.component.html',
  styleUrls: ['./servicios.component.scss'],
})
export class ServiciosComponent implements OnInit {
  private svc = inject(ServiciosService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  filas: FilaServicio[] = [];
  cargando = true;
  guardando = false;
  mensaje: string | null = null;
  error: string | null = null;

  ngOnInit(): void {
    this.cargar();
  }

  volver(): void {
    this.router.navigate(['/dashboard/taller/inicio']);
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    console.log('[Servicios] cargar →');
    forkJoin({
      categorias: this.svc.listarCategorias(),
      mios: this.svc.listarMisServicios(),
    }).subscribe({
      next: ({ categorias, mios }) => {
        console.log(`[Servicios] cargar ← OK categorias=${categorias.length} mios=${mios.length}`);
        const mioPorCat = new Map(mios.map(m => [m.id_categoria, m]));
        this.filas = categorias.map(cat => {
          const m = mioPorCat.get(cat.id_categoria);
          return {
            categoria: cat,
            activo: !!m,
            servicio_movil: m?.servicio_movil ?? false,
            tarifa_base: m?.tarifa_base ?? null,
          };
        });
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('[Servicios] cargar ← ERROR', { status: e?.status, detail: e?.error?.detail, message: e?.message });
        this.error = 'Error cargando datos: ' + (e?.error?.detail ?? e?.message ?? 'Error');
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardar(): void {
    const servicios: TallerServicio[] = this.filas
      .filter(f => f.activo)
      .map(f => ({
        id_categoria: f.categoria.id_categoria,
        servicio_movil: f.servicio_movil,
        tarifa_base: f.tarifa_base ?? undefined,
      }));

    this.guardando = true;
    this.mensaje = null;
    this.error = null;
    this.svc.guardarServicios(servicios).subscribe({
      next: () => {
        this.mensaje = `Guardado: ${servicios.length} servicio(s) activos`;
        this.guardando = false;
      },
      error: (e) => {
        this.error = e?.error?.detail ?? e?.message ?? 'Error guardando';
        this.guardando = false;
      },
    });
  }
}
