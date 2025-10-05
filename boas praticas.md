# Desenvolvendo um Componente de Forma Profissional no Angular

Desenvolver um componente profissional no Angular em 2025 significa priorizar modularidade, performance, reusabilidade e manutenibilidade. Com a evolução do framework (como o foco em componentes standalone e signals), as melhores práticas enfatizam código limpo, tipagem forte e otimização. A seguir, um guia passo a passo baseado em padrões atuais, dividido em seções para facilitar a compreensão.

## 1. Preparação e Geração do Componente

- **Use o Angular CLI para gerar o componente**: Evite criar arquivos manualmente. Execute `ng generate component nome-do-componente --standalone` para criar um componente standalone, que reduz boilerplate e melhora a encapsulação. Isso importa módulos necessários diretamente no decorador `@Component`.
- **Estrutura de diretórios**: Organize por features, não por tipo. Exemplo para um feature de "usuário":
  ```
  /src/app/features/user/
    components/
      user-card/
        user-card.component.ts
        user-card.component.html
        user-card.component.scss
    services/
    models/
    user.routes.ts
  ```
  Mantenha componentes compartilhados em `/shared/components`. Limite o tamanho do componente a 200-400 linhas de código para facilitar a leitura.

## 2. Estrutura Básica do Componente

- **Adote componentes standalone**: No decorador `@Component`, defina `standalone: true` e liste imports diretos (ex.: `CommonModule`, `RouterModule`). Exemplo:
  ```typescript
  import { Component, Input } from '@angular/core';
  import { CommonModule } from '@angular/common';

  @Component({
    standalone: true,
    selector: 'app-user-card',
    templateUrl: './user-card.component.html',
    styleUrls: ['./user-card.component.scss'],
    imports: [CommonModule]
  })
  export class UserCardComponent {
    @Input() readonly user!: Readonly<User>; // Tipagem imutável
  }
  ```
  Isso evita módulos NgModule desnecessários e facilita lazy loading.
- **Separe responsabilidades**: Mantenha templates e estilos em arquivos separados. Use o padrão "smart vs. dumb": componentes "smart" lidam com lógica de negócio; "dumb" focam em exibição de dados.
- **Nomeação consistente**: Use kebab-case para seletores (ex.: `app-user-card`) e camelCase para propriedades/métodos. Exporte via `index.ts` para imports simplificados: `export * from './user-card.component';`.

## 3. Comunicação e Fluxo de Dados

- **Inputs e Outputs**: Para comunicação pai-filho, use `@Input()` para dados de entrada e `@Output() EventEmitter` para eventos. Exemplo:
  ```typescript
  import { Output, EventEmitter } from '@angular/core';

  @Output() userSelected = new EventEmitter<User>();

  onSelectUser() {
    this.userSelected.emit(this.user);
  }
  ```
  Mantenha fluxo unidirecional (pai → filho) para simplicidade.
- **Gerenciamento de estado**: Para apps pequenos, use serviços com RxJS Observables e `async` pipe no template (ex.: `{{ data$ | async }}`) para evitar vazamentos de memória. Para escalabilidade, adote NgRx ou Akita para estado centralizado.
- **Signals para reatividade**: Em 2025, prefira signals para detecção de mudanças fina e zoneless (sem Zone.js). Exemplo:
  ```typescript
  import { signal, inject } from '@angular/core';

  export class UserListComponent {
    readonly users = signal<User[]>([]);
    private api = inject(UserApiService);

    constructor() {
      this.api.fetchUsers().subscribe(data => this.users.set(data));
    }
  }
  ```
  No template: `*ngFor="let user of users()"`.

## 4. Performance e Otimização

- **Detecção de mudanças OnPush**: Defina `changeDetection: ChangeDetectionStrategy.OnPush` no decorador para checks manuais e melhor performance.
- **Otimize loops**: Use `trackBy` em `*ngFor` com IDs únicos: 
  ```typescript
  trackByUserId(index: number, user: User) { return user.id; }
  ```
- **Lazy loading e virtual scroll**: Carregue módulos on-demand via rotas. Para listas grandes, use CDK Virtual Scroll: `<cdk-virtual-scroll-viewport itemSize="50">`.
- **Imutabilidade**: Use `readonly` e `Readonly<T>` para propriedades, evitando mutações inesperadas e facilitando debug.

## 5. Tipagem e Código Limpo (TypeScript)

- **Tipagem forte**: Sempre declare tipos explícitos, interfaces e enums. Exemplo: `interface User { id: number; name: string; }`. Use tipos literais para strings seguras: `status: 'active' | 'inactive';`.
- **ES6+ features**: Arrow functions, destructuring e `const` para imutáveis.
- **Linting**: Integre ESLint para regras como `no-any` e `no-console`. Documente com JSDoc: `/** @param user O usuário. @returns void */`.

## 6. Testes e Manutenção

- **Cobertura de testes**: Mire 80-90% com Jasmine/Karma para unit tests e Cypress para E2E. Use TDD e integre CI (ex.: GitHub Actions).
- **Documentação**: Adicione README com exemplos de uso ou use Storybook. Realize code reviews regulares.
- **Hooks de ciclo de vida**: Use `ngOnInit` para init e `ngOnDestroy` para cleanup (ex.: unsubscribes).

## Tabela de Comparação: Práticas Antigas vs. 2025

| Aspecto              | Prática Antiga (pré-2025)                  | Prática 2025 (Recomendada)                  |
|----------------------|--------------------------------------------|---------------------------------------------|
| **Módulos**         | NgModules com declarations                 | Standalone components com imports diretos   |
| **Reatividade**     | Zone.js e Observables                      | Signals para detecção fina e zoneless       |
| **Estado**          | Subjects em serviços                       | NgRx/Akita ou signals para centralização    |
| **Performance**     | Default change detection                   | OnPush + trackBy + virtual scroll           |
| **Estrutura**       | Por tipo (components/)                     | Por feature (features/user/components/)     |

Siga essas práticas para componentes escaláveis e profissionais. Para migração de código legado, use schematics do CLI. Consulte a documentação oficial do Angular para exemplos atualizados!