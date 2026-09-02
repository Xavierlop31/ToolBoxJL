import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styles: `
    .navbar {
      background-color: var(--tbjl-color-primary-500, #141cdb);
      color: #ffffff;
      height: 64px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .navbar-container {
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-family: var(--tbjl-font-family-headings, 'Montserrat', sans-serif);
      color: #ffffff;
      text-decoration: none;
      cursor: pointer;
    }
    .logo-icon {
      font-size: 28px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .nav-icon {
      font-size: 18px;
    }
    .user-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .btn-cart-icon {
      padding: 8px;
      border-radius: 9999px;
    }
    .btn-cart-icon .material-symbols-outlined {
      font-size: 22px;
    }
    .user-badge {
      background: rgba(255, 255, 255, 0.15);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `,
})
export class AppComponent {
  title = 'shell';
  readonly auth = inject(AuthService);

  signOut(): void {
    void this.auth.signOut();
  }
}
