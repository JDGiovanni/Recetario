class EstadoCarga {
  constructor(contenedor) {
    if (!contenedor) {
      throw new TypeError('EstadoCarga requiere un contenedor.');
    }
    this.contenedor = contenedor;
  }

  escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caracter]);
  }

  mostrarCargando(mensaje = 'Cargando...') {
    this.contenedor.innerHTML = `<div class="skeleton-loader" role="status" aria-live="polite">${this.escaparHTML(mensaje)}</div>`;
  }

  mostrarError(mensaje, callbackReintentar) {
    this.contenedor.innerHTML = `
      <div class="error-banner" role="alert">
        <p>${this.escaparHTML(mensaje)}</p>
        ${callbackReintentar ? '<button class="btn-primario btn-reintentar">Reintentar</button>' : ''}
      </div>
    `;
    if (callbackReintentar) {
      this.contenedor.querySelector('.btn-reintentar').addEventListener('click', callbackReintentar);
    }
  }

  destruir() {
    this.contenedor.replaceChildren();
  }
}
