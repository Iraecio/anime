// Script para debug da paginação
console.log('=== DEBUG PAGINAÇÃO ===');

// Aguarda o componente carregar
setTimeout(() => {
  // Procura pelos botões de paginação
  const paginationButtons = document.querySelectorAll('.pagination .page-link');
  
  console.log('Botões de paginação encontrados:', paginationButtons.length);
  
  paginationButtons.forEach((button, index) => {
    console.log(`Botão ${index}:`, button.textContent, button.disabled);
    
    // Adiciona listener para debug
    button.addEventListener('click', (event) => {
      console.log('Clique detectado no botão:', button.textContent);
      console.log('Event target:', event.target);
    });
  });
  
  // Procura especificamente pelo botão da página 2
  const page2Button = Array.from(paginationButtons).find(btn => btn.textContent.trim() === '2');
  if (page2Button) {
    console.log('Botão página 2 encontrado:', page2Button);
    console.log('Botão página 2 disabled:', page2Button.disabled);
    console.log('Botão página 2 classes:', page2Button.className);
  } else {
    console.log('Botão página 2 NÃO encontrado');
  }
}, 2000);