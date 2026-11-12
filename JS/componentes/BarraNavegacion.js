class BarraNavegacion {
  constructor(contenedor, opciones = {}) {
    if (!contenedor) {
      throw new TypeError('BarraNavegacion requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.rutas = opciones.rutas || [
      { texto: 'Inicio', ruta: '#inicio' },
      { texto: 'Explorar', ruta: '#explorar' },
      { texto: 'Categorías y orígenes', ruta: '#categorias' },
      { texto: 'Comparador', ruta: '#comparador' }
    ];
    this.manejarCambioRuta = () => this.render();

    window.addEventListener('hashchange', this.manejarCambioRuta);
    this.render();
  }

  render() {
    const rutaActual = (window.location.hash || '#inicio').split('/')[0];

    this.contenedor.innerHTML = this.rutas.map(({ texto, ruta }) => {
      const activa = ruta === rutaActual;
      return `
        <a
          class="nav-link${activa ? ' activa' : ''}"
          href="${ruta}"
          data-link
          ${activa ? 'aria-current="page"' : ''}
        >${texto}</a>
      `;
    }).join('');
  }

  destruir() {
    window.removeEventListener('hashchange', this.manejarCambioRuta);
    this.contenedor.innerHTML = '';
  }
}
