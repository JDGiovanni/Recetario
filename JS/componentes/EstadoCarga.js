class EstadoCarga {
  constructor(contenedor) {
    this.contenedor = contenedor;
  }
  mostrarCargando(mensaje = 'Cargando...') {
    this.contenedor.innerHTML = `<div class="skeleton-loader">${mensaje}</div>`;
  }
  mostrarError(mensaje, callbackReintentar) {
    this.contenedor.innerHTML = `
      <div class="error-banner">
        <p>${mensaje}</p>
        ${callbackReintentar ? '<button class="btn-primario btn-reintentar">Reintentar</button>' : ''}
      </div>
    `;
    if (callbackReintentar) {
      this.contenedor.querySelector('.btn-reintentar').addEventListener('click', callbackReintentar);
    }
  }
  destruir() { this.contenedor.innerHTML = ''; }
}
