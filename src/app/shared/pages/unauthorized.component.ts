import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <h1>🚫 Acceso Denegado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        <button (click)="goBack()" class="btn btn-primary">
          Volver al Dashboard
        </button>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .unauthorized-content {
      background: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    h1 {
      font-size: 32px;
      margin: 0 0 10px 0;
      color: #333;
    }
    
    p {
      font-size: 16px;
      color: #666;
      margin: 0 0 30px 0;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      
      &.btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
      }
    }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
