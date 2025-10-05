# Práticas de Code Calisthenics (Object Calisthenics)

O Code Calisthenics, também conhecido como Object Calisthenics, é um conjunto de 9 regras simples para escrever código mais limpo, mantível e legível. Elas foram formalizadas por Jeff Bay no livro *The ThoughtWorks Anthology* e são exercícios para melhorar a qualidade do código orientado a objetos. A seguir, a lista completa das práticas, com uma breve explicação para cada uma:

1. **Apenas um nível de indentação por método**  
   Mantenha os métodos simples, com no máximo um nível de indentação (ex.: um if ou loop). Isso reduz a complexidade e garante que cada método faça apenas uma coisa. Se houver mais níveis, extraia métodos menores.

2. **Não use a palavra-chave "else"**  
   Evite blocos else para reduzir ramificações condicionais. Use retornos precoces (early return), polimorfismo ou padrões como Null Object para lidar com condições de forma mais limpa.

3. **Encapsule todos os primitivos e strings**  
   Não use tipos primitivos (como int ou string) diretamente; crie objetos wrapper para eles (ex.: uma classe `Hora` em vez de `int`). Isso evita o anti-padrão "Primitive Obsession" e dá significado aos valores.

4. **Coleções de primeira classe**  
   Qualquer classe que contenha uma coleção não deve ter outras variáveis de instância. Crie uma classe dedicada para gerenciar a coleção e seus comportamentos (ex.: métodos de filtro ou iteração).

5. **Um ponto por linha**  
   Limite o acesso a objetos a um método por linha (ex.: evite `a.b().c()`). Isso segue a Lei de Demeter ("fale apenas com seus amigos") e evita violações de encapsulamento.

6. **Não abrevie**  
   Use nomes completos e descritivos para classes, métodos e variáveis. Abreviações indicam problemas maiores, como duplicação de código ou responsabilidades mal distribuídas.

7. **Mantenha todas as entidades pequenas**  
   Limite classes a no máximo 50 linhas e pacotes a 10 arquivos. Entidades pequenas são mais fáceis de entender, reutilizar e testar, promovendo coesão.

8. **Não use classes com mais de duas variáveis de instância**  
   Classes devem gerenciar no máximo duas variáveis (ex.: estado de um objeto ou coordenação entre dois). Isso força desacoplamento e alta coesão.

9. **Não use métodos get e set**  
   Evite getters e setters simples, pois eles expõem detalhes de implementação. Prefira métodos de comportamento (ex.: `encherCombustivel(Combustivel)` em vez de `getTanque()`). Use construtores para inicialização e mantenha objetos imutáveis quando possível.

Essas práticas são exercícios para refatorar código existente e promover princípios como SRP (Princípio da Responsabilidade Única) e encapsulamento. Elas não são regras rígidas para produção, mas ajudam a identificar problemas. Para mais detalhes, consulte fontes especializadas.