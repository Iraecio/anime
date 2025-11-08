import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImageErrorDebugComponent } from './components/image-error-debug.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ImageErrorDebugComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'anime';
}
