import { Component, inject, computed } from '@angular/core';
import { ImageErrorService } from '../services/image-error.service';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'app-image-error-debug',
  standalone: true,
  imports: [JsonPipe],
  template: `
    @if (showDebugInfo()) {
      <div class="image-error-debug">
        <h4>🖼️ Debug de Imagens com Erro</h4>
        <div class="debug-stats">
          <div class="stat">
            <span class="label">Animes com erro:</span>
            <span class="value">{{ errorCount() }}</span>
          </div>
          <div class="stat">
            <span class="label">Atualizando:</span>
            <span class="value" [class.updating]="isUpdating()">
              {{ isUpdating() ? '✅ Sim' : '❌ Não' }}
            </span>
          </div>
        </div>
        @if (erroredIds().length > 0) {
          <div class="errored-ids">
            <strong>IDs com erro:</strong>
            <div class="ids-list">{{ erroredIds() | json }}</div>
          </div>
        }
        <div class="debug-actions">
          <button 
            (click)="forceUpdate()" 
            [disabled]="errorCount() === 0 || isUpdating()"
            class="force-update-btn"
          >
            🔄 Forçar Atualização
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .image-error-debug {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      min-width: 250px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .image-error-debug h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
    }

    .debug-stats {
      margin-bottom: 12px;
    }

    .stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .value.updating {
      color: #4ade80;
    }

    .errored-ids {
      margin-bottom: 12px;
    }

    .ids-list {
      background: rgba(255, 255, 255, 0.1);
      padding: 8px;
      border-radius: 4px;
      margin-top: 4px;
      max-height: 100px;
      overflow-y: auto;
      word-break: break-all;
    }

    .debug-actions {
      margin-top: 12px;
    }

    .force-update-btn {
      background: #e11d48;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }

    .force-update-btn:disabled {
      background: #6b7280;
      cursor: not-allowed;
    }

    .force-update-btn:not(:disabled):hover {
      background: #be123c;
    }
  `]
})
export class ImageErrorDebugComponent {
  private imageErrorService = inject(ImageErrorService);

  // Computed properties para reactive updates
  readonly errorCount = computed(() => this.imageErrorService.errorCount());
  readonly isUpdating = computed(() => this.imageErrorService.isCurrentlyUpdating());
  readonly erroredIds = computed(() => this.imageErrorService.getErroredAnimeIds());
  
  // Só mostra se há erros ou está atualizando
  readonly showDebugInfo = computed(() => 
    this.errorCount() > 0 || this.isUpdating()
  );

  forceUpdate(): void {
    this.imageErrorService.forceUpdate();
  }
}