import { Component, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cache-debug',
  imports: [CommonModule],
  template: `
    <div class="cache-debug">
      <h3>🔄 Cache Statistics</h3>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats().hits }}</div>
          <div class="stat-label">Cache Hits</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats().misses }}</div>
          <div class="stat-label">Cache Misses</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ hitRate().toFixed(1) }}%</div>
          <div class="stat-label">Hit Rate</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats().entries }}</div>
          <div class="stat-label">Entries</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats().size }}</div>
          <div class="stat-label">Cache Size</div>
        </div>
      </div>

      <div class="actions">
        <button 
          class="btn btn-refresh" 
          (click)="refreshStats()"
          type="button">
          🔄 Refresh Stats
        </button>
        
        <button 
          class="btn btn-clear" 
          (click)="clearCache()"
          type="button">
          🗑️ Clear Cache
        </button>
        
        <button 
          class="btn btn-preload" 
          (click)="preloadCache()"
          type="button">
          ⚡ Preload Cache
        </button>
      </div>

      <div class="info">
        <small>
          Cache improves performance by storing frequently accessed data. 
          Higher hit rate means better performance.
        </small>
      </div>
    </div>
  `,
  styles: [`
    .cache-debug {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    h3 {
      margin: 0 0 1rem 0;
      color: #495057;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 0.75rem;
      text-align: center;
      transition: transform 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #28a745;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      border: none;
      border-radius: 4px;
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-refresh {
      background: #17a2b8;
      color: white;
    }

    .btn-refresh:hover {
      background: #138496;
    }

    .btn-clear {
      background: #dc3545;
      color: white;
    }

    .btn-clear:hover {
      background: #c82333;
    }

    .btn-preload {
      background: #ffc107;
      color: #212529;
    }

    .btn-preload:hover {
      background: #e0a800;
    }

    .info {
      color: #6c757d;
      font-style: italic;
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class CacheDebugComponent {
  private supabaseService = inject(SupabaseService);
  
  // Signal para forçar atualização das estatísticas
  private refreshTrigger = signal(0);
  
  // Computed para as estatísticas do cache
  stats = computed(() => {
    // Força reatividade quando refreshTrigger muda
    this.refreshTrigger();
    return this.supabaseService.getCacheStats();
  });
  
  // Computed para taxa de hit
  hitRate = computed(() => {
    // Força reatividade quando refreshTrigger muda
    this.refreshTrigger();
    return this.supabaseService.getCacheHitRate();
  });

  /**
   * Atualiza as estatísticas
   */
  refreshStats(): void {
    this.refreshTrigger.update(count => count + 1);
  }

  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    if (confirm('Tem certeza que deseja limpar todo o cache?')) {
      this.supabaseService.clearCache();
      this.refreshStats();
    }
  }

  /**
   * Pré-carrega o cache
   */
  preloadCache(): void {
    this.supabaseService.preloadCache();
    // Atualiza estatísticas após um delay para mostrar o efeito
    setTimeout(() => this.refreshStats(), 1000);
  }
}