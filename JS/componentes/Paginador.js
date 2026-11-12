class Paginador {
  constructor(contenedor, opciones = {}) {
    if (!contenedor) {
      throw new TypeError('Paginador requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.paginaActual = Number(opciones.paginaActual) || 1;
    this.totalElementos = Math.max(0, Number(opciones.totalElementos) || 0);
    this.porPagina = Math.max(1, Number(opciones.porPagina) || 12);
    this.alCambiar = opciones.alCambiar;
  }

  get totalPaginas() {
    return Math.ceil(this.totalElementos / this.porPagina);
  }

  render() {
    const totalPaginas = this.totalPaginas;
    if (totalPaginas <= 1) {
      return '';
    }

    const pagina = Math.min(Math.max(1, this.paginaActual), totalPaginas);
    return `
      <nav class="paginador" aria-label="Paginación">
        <button type="button" class="btn-pagina-anterior" ${pagina === 1 ? 'disabled' : ''}>
          Anterior
        </button>
        <span aria-live="polite">Página ${pagina} de ${totalPaginas}</span>
        <button type="button" class="btn-pagina-siguiente" ${pagina === totalPaginas ? 'disabled' : ''}>
          Siguiente
        </button>
      </nav>
    `;
  }

  montar() {
    this.paginaActual = Math.min(Math.max(1, this.paginaActual), Math.max(1, this.totalPaginas));
    this.contenedor.innerHTML = this.render();

    if (this.totalPaginas <= 1) {
      return;
    }

    this.contenedor.querySelector('.btn-pagina-anterior')
      .addEventListener('click', () => this.cambiarPagina(this.paginaActual - 1));
    this.contenedor.querySelector('.btn-pagina-siguiente')
      .addEventListener('click', () => this.cambiarPagina(this.paginaActual + 1));
  }

  cambiarPagina(pagina) {
    const siguiente = Math.min(Math.max(1, pagina), this.totalPaginas);
    if (siguiente === this.paginaActual) {
      return;
    }

    this.paginaActual = siguiente;
    this.montar();

    if (typeof this.alCambiar === 'function') {
      this.alCambiar(this.paginaActual);
    }
  }
}
