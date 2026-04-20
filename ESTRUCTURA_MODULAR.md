# 📊 Sistema de Autenticación y Dashboards por Roles

## 🏗️ Estructura Modular

```
src/app/
├── auth/                          # 🔐 Módulo de Autenticación
│   ├── login.component.ts         # Componente de Login
│   ├── login.component.html       # Template del Login
│   └── login.component.scss       # Estilos del Login
│
├── dashboards/                    # 📊 Módulo de Dashboards (separado por rol)
│   ├── cliente/                   # Dashboard para Clientes (id_rol=1)
│   │   ├── dashboard-cliente.component.ts
│   │   ├── dashboard-cliente.component.html
│   │   └── dashboard-cliente.component.scss
│   │
│   ├── tecnico/                   # Dashboard para Técnicos (id_rol=3)
│   │   ├── dashboard-tecnico.component.ts
│   │   ├── dashboard-tecnico.component.html
│   │   └── dashboard-tecnico.component.scss
│   │
│   ├── taller/                    # Dashboard para Talleres (id_rol=2)
│   │   ├── dashboard-taller.component.ts
│   │   ├── dashboard-taller.component.html
│   │   └── dashboard-taller.component.scss
│   │
│   └── admin/                     # Dashboard para Admin (id_rol=4)
│       ├── dashboard-admin.component.ts
│       ├── dashboard-admin.component.html
│       └── dashboard-admin.component.scss
│
├── shared/                        # 🛠️ Servicios y Guardias Compartidos
│   ├── services/
│   │   ├── auth.service.ts        # Servicio de autenticación
│   │   └── http.service.ts        # Servicio HTTP con token automático
│   │
│   ├── guards/
│   │   └── auth.guard.ts          # Guards: authGuard, roleGuard, publicGuard
│   │
│   └── pages/
│       └── unauthorized.component.ts  # Página de acceso denegado
│
├── app.routes.ts                  # Rutas y configuración de guards
├── app.config.ts                  # Configuración de la app
├── app.ts                         # Componente raíz
└── app.html                       # Template raíz
```

## 🔑 Características Principales

### 1. **Servicios Compartidos**

#### `auth.service.ts`
```typescript
// Login
login(email, password) → Observable<LoginResponse>

// State Management
getCurrentUser$() → Observable<User>
getIsAuthenticated$() → Observable<boolean>

// Métodos de utilidad
getToken() → string | null
getUserRole() → number | null
hasRole(role: number) → boolean
hasAnyRole(roles: number[]) → boolean
logout() → void
```

#### `http.service.ts`
```typescript
// Envuelve HttpClient y agrega automáticamente el token JWT
get<T>(endpoint: string) → Observable<T>
post<T>(endpoint: string, body: any) → Observable<T>
put<T>(endpoint: string, body: any) → Observable<T>
delete<T>(endpoint: string) → Observable<T>
```

### 2. **Guards de Protección**

#### `authGuard`
- Protege rutas que requieren autenticación
- Redirige a `/login` si no hay token

#### `roleGuard(roles: number[])`
- Verifica si el usuario tiene uno de los roles permitidos
- Redirige a `/unauthorized` si no tiene permiso

#### `publicGuard`
- Permite solo a usuarios no autenticados (login, registro)
- Redirige automáticamente al dashboard según el rol

### 3. **Rutas Configuradas**

```
/login                          → LoginComponent (acceso público)
/dashboard/cliente              → DashboardClienteComponent (rol 1)
/dashboard/tecnico              → DashboardTecnicoComponent (rol 3)
/dashboard/taller               → DashboardTallerComponent (rol 2)
/dashboard/admin                → DashboardAdminComponent (rol 4)
/unauthorized                   → UnauthorizedComponent
/                               → Redirige según el dashboard
*                               → Redirige a /login
```

## 🔐 Sistema de Autenticación

### Flujo de Login

1. Usuario ingresa email y contraseña en `/login`
2. `LoginComponent` llama a `AuthService.login()`
3. Backend retorna `access_token` + datos del usuario
4. Se guardan en `localStorage`:
   - `access_token` → JWT token
   - `user_data` → Información del usuario
5. Se redirige al dashboard según el `id_rol`:
   - `id_rol=1` → `/dashboard/cliente`
   - `id_rol=3` → `/dashboard/tecnico`
   - `id_rol=2` → `/dashboard/taller`
   - `id_rol=4` → `/dashboard/admin`

### Flujo de Peticiones HTTP

```
HttpService.get/post/put/delete()
    ↓
Obtiene token de AuthService
    ↓
Agrega Header: Authorization: Bearer {token}
    ↓
Realiza petición a la API
    ↓
Retorna la respuesta
```

### Flujo de Guards

**En cada navegación:**

1. Se verifica el `authGuard` (¿está autenticado?)
2. Se verifica el `roleGuard` (¿tiene el rol necesario?)
3. Si falla → Se redirige a `/login` o `/unauthorized`
4. Si pasa → Se permite la navegación

## 📱 Roles Soportados

| Rol | ID | Dashboard | Acceso |
|-----|----|-----------| -------|
| Cliente (Conductor) | 1 | `/dashboard/cliente` | Reportar emergencias |
| Técnico (Mecánico) | 3 | `/dashboard/tecnico` | Ver asignaciones |
| Taller (Gerente) | 2 | `/dashboard/taller` | Gestionar taller |
| Admin (Sistema) | 4 | `/dashboard/admin` | Control total |

## 🎨 Dashboards

Cada dashboard tiene:
- **Header personalizado** con nombre del usuario y botón logout
- **Sección de bienvenida** con mensaje personalizado
- **Acciones rápidas** (botones para funcionalidades principales)
- **Tabla de datos** (incidentes, asignaciones, etc.)
- **Estadísticas** (para Taller y Admin)
- **Responsive design** (se adapta a dispositivos móviles)

## 🧪 Testing del Login

La página de login incluye botones para cargar credenciales de prueba:

```bash
# Cliente (Conductor)
Email: conductor@ejemplo.com
Password: miPassword123!

# Técnico (Mecánico)
Email: tecnico.juan@taller.com
Password: password456!

# Taller (Gerente)
Email: gerente@tallerexcelente.com
Password: gerente789!

# Admin
Email: admin@plataforma.com
Password: admin2026!
```

## 🚀 Próximos Pasos

1. **Conectar a la API real** - Actualizar `authService.baseUrl`
2. **Implementar funcionalidades en dashboards** - Agregar llamadas a API
3. **Agregar más módulos** - Incidencias, usuarios, etc.
4. **Implementar interceptor** - Para manejo global de errores
5. **Agregar notificaciones** - Toast/Snackbar para feedback

## 📝 Notas Importantes

- **Tokens JWT** se guardan en `localStorage` (considerar usar `sessionStorage` para mayor seguridad)
- **Todos los servicios son `providedIn: 'root'`** - Singletons a nivel de aplicación
- **Componentes standalone** - No usan módulos NgModule
- **Archivo HttpService** envuelve las peticiones para agregar automáticamente el token
- **Los Guards usan CanActivateFn** - Forma moderna de Angular v15+

## 🔗 Referencias

- Documentación de autenticación: [guias/LOGIN_POR_ROLES.md](../guias/LOGIN_POR_ROLES.md)
- API Base URL: `http://localhost:8000`
- Token expira en: 30 minutos (configurable en backend)
