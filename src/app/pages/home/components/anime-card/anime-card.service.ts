import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AnimeCardService {
  private readonly http = inject(HttpClient);
  private readonly api = "http://54.221.71.79/";

  getUpdateEpisodesFromAnime(animeId: number) {
    return this.http.get(`${this.api}anime/${animeId}/atualizar`);
  }
}
