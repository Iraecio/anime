import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        loadComponent: () => import('./pages/home/home').then(m => m.Home)
    },
    {
        path: 'player/:animeSlug/:episodeId',
        loadComponent: () => import('./pages/player/player').then(m => m.EpisodePlayer)
    },
];
