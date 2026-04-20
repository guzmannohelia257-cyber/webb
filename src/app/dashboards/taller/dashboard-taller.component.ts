import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, TallerAuth } from '../../shared/services/auth.service';
import { TallerService, Taller, Tecnico } from '../../shared/services/taller.service';

@Component({
  selector: 'app-dashboard-taller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-taller.component.html',
  styleUrl: './dashboard-taller.component.scss'
})
export class DashboardTallerComponent implements OnInit {
  currentTaller: TallerAuth | null = null;
  taller: Taller | null = null;
  tecnicos: Tecnico[] = [];
  
  editForm: FormGroup;
  formTecnico: FormGroup;
  
  mostrarFormularioEdicion = false;
  mostrarFormularioTecnico = false;
  tecnicoEnEdicion: Tecnico | null = null;
  
  guardando = false;
  guardandoTecnico = false;
  error: string | null = null;
  errorTecnico: string | null = null;
  exito: string | null = null;
  exitoTecnico: string | null = null;

  quickActions = [
    { icon: '📋', label: 'Asignaciones', action: 'assignments' },
    { icon: '👨‍🔧', label: 'Mis Técnicos', action: 'technicians' },
    { icon: '📈', label: 'Ganancias', action: 'earnings' },
  ];

  stats = [
    { label: 'Trabajos Completados', value: '42', icon: '✅' },
    { label: 'Trabajos en Progreso', value: '8', icon: '⏳' },
    { label: 'Ingresos este Mes', value: '$1,250', icon: '💰' },
  ];

  constructor(
    private authService: AuthService,
    private tallerService: TallerService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.currentTaller = this.authService.getCurrentTaller();
    this.editForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', Validators.required],
      telefono: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      descripcion: ['', Validators.minLength(10)]
    });
    this.formTecnico = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    console.log('🔧 DashboardTallerComponent ngOnInit');
    this.cargarDatosTaller();
    this.cargarTecnicos();
  }

  cargarDatosTaller(): void {
    console.log('📊 Cargando datos del taller...');
    this.tallerService.obtenerMiTaller().subscribe({
      next: (data) => {
        console.log('✅ Datos del taller cargados:', data);
        this.taller = data;
        this.editForm.patchValue({
          nombre: data.nombre,
          direccion: data.direccion,
          telefono: data.telefono,
          email: data.email,
          descripcion: data.descripcion
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar datos del taller:', err);
        this.error = 'Error al cargar datos del taller';
      }
    });
  }

  cargarTecnicos(): void {
    console.log('👨‍🔧 Cargando técnicos...');
    this.tallerService.obtenerTecnicos().subscribe({
      next: (data) => {
        console.log('✅ Técnicos cargados:', data);
        console.log('📊 Cantidad de técnicos:', data.length);
        console.log('🔍 Estructura del primer técnico:', data[0]);
        this.tecnicos = [...data];
        console.log('✨ this.tecnicos asignado:', this.tecnicos);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error al cargar técnicos:', err);
        this.errorTecnico = 'Error al cargar técnicos';
        this.cdr.detectChanges();
      }
    });
  }

  abrirFormularioEdicion(): void {
    this.mostrarFormularioEdicion = true;
    this.error = null;
    this.exito = null;
  }

  cerrarFormularioEdicion(): void {
    this.mostrarFormularioEdicion = false;
    this.error = null;
    this.exito = null;
  }

  abrirFormularioTecnico(): void {
    this.mostrarFormularioTecnico = true;
    this.tecnicoEnEdicion = null;
    this.formTecnico.reset();
    this.errorTecnico = null;
    this.exitoTecnico = null;
  }

  cerrarFormularioTecnico(): void {
    this.mostrarFormularioTecnico = false;
    this.tecnicoEnEdicion = null;
    this.errorTecnico = null;
    this.exitoTecnico = null;
    this.formTecnico.reset();
  }

  guardarCambios(): void {
    if (this.editForm.invalid) {
      this.error = 'Por favor completa todos los campos correctamente';
      return;
    }

    this.guardando = true;
    this.error = null;
    this.exito = null;

    this.tallerService.actualizarMiTaller(this.editForm.value).subscribe({
      next: (data) => {
        this.taller = data;
        this.exito = '✅ Datos del taller actualizados correctamente';
        this.guardando = false;
        setTimeout(() => {
          this.cerrarFormularioEdicion();
          this.exito = null;
        }, 2000);
      },
      error: (err) => {
        this.error = err.error?.detail || 'Error al actualizar el taller';
        this.guardando = false;
      }
    });
  }

  guardarTecnico(): void {
    if (this.formTecnico.invalid) {
      this.errorTecnico = 'Por favor completa todos los campos correctamente';
      return;
    }

    this.guardandoTecnico = true;
    this.errorTecnico = null;
    this.exitoTecnico = null;

    if (this.tecnicoEnEdicion) {
      // Editar técnico existente
      const { nombre, telefono } = this.formTecnico.value;
      console.log('📝 Editando técnico:', this.tecnicoEnEdicion.id_tecnico);
      this.tallerService.actualizarTecnico(this.tecnicoEnEdicion.id_tecnico, { nombre, telefono }).subscribe({
        next: (data) => {
          const index = this.tecnicos.findIndex(t => t.id_tecnico === this.tecnicoEnEdicion?.id_tecnico);
          if (index !== -1) {
            this.tecnicos[index] = data;
          }
          this.exitoTecnico = '✅ Técnico actualizado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.cerrarFormularioTecnico();
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al actualizar técnico';
          this.guardandoTecnico = false;
        }
      });
    } else {
      // Agregar nuevo técnico
      console.log('➕ Agregando nuevo técnico');
      this.tallerService.agregarTecnico(this.formTecnico.value).subscribe({
        next: (data) => {
          this.tecnicos.push(data);
          this.exitoTecnico = '✅ Técnico agregado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.cerrarFormularioTecnico();
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al agregar técnico';
          this.guardandoTecnico = false;
        }
      });
    }
  }

  editarTecnico(tecnico: Tecnico): void {
    console.log('✏️ Editando técnico:', tecnico);
    this.tecnicoEnEdicion = tecnico;
    this.formTecnico.patchValue({
      nombre: tecnico.nombre,

      telefono: tecnico.telefono,
      password: ''
    });
    this.formTecnico.get('password')?.clearValidators();
    this.formTecnico.get('password')?.updateValueAndValidity();
    this.mostrarFormularioTecnico = true;
    this.errorTecnico = null;
    this.exitoTecnico = null;
  }

  eliminarTecnico(tecnico: Tecnico): void {
    if (confirm(`¿Está seguro de que desea eliminar a ${tecnico.nombre}?`)) {
      console.log('🗑️ Eliminando técnico:', tecnico.id_tecnico);
      this.guardandoTecnico = true;
      this.tallerService.removerTecnico(tecnico.id_tecnico).subscribe({
        next: () => {
          this.tecnicos = this.tecnicos.filter(t => t.id_tecnico !== tecnico.id_tecnico);
          this.exitoTecnico = '✅ Técnico eliminado correctamente';
          this.guardandoTecnico = false;
          setTimeout(() => {
            this.exitoTecnico = null;
          }, 2000);
        },
        error: (err) => {
          this.errorTecnico = err.error?.detail || 'Error al eliminar técnico';
          this.guardandoTecnico = false;
        }
      });
    }
  }

  handleAction(action: string): void {
    if (action === 'technicians') {
      // Scroll a la sección de técnicos
      const section = document.querySelector('.tecnicos-section');
      section?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
