class ListaIngredientes {
  constructor(contenedor, ingredientes = [], opciones = {}) {
    if (!contenedor) {
      throw new TypeError('ListaIngredientes requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.opciones = opciones;
    this.ingredientes = this.normalizar(ingredientes);
    this.render();
  }

  normalizar(datos) {
    if (!Array.isArray(datos)) return [];
    return datos.map(ingrediente => {
      if (typeof ingrediente === 'string') {
        return { nombre: ingrediente.trim(), medida: '' };
      }
      return {
        nombre: String(ingrediente?.nombre || ingrediente?.strIngredient || '').trim(),
        medida: String(ingrediente?.medida || ingrediente?.strMeasure || '').trim()
      };
    }).filter(ingrediente => ingrediente.nombre);
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

  render() {
    if (!this.ingredientes.length) {
      this.contenedor.innerHTML = '<p class="estado-vacio">No hay ingredientes disponibles.</p>';
      return;
    }

    this.contenedor.innerHTML = `
      <div class="grid-ingredientes">
        ${this.ingredientes.map(({ nombre, medida }) => `
          <div class="ingrediente-item">
            ${this.opciones.mostrarImagenes === false ? '' : `
              <img
                src="https://www.themealdb.com/images/ingredients/${encodeURIComponent(nombre)}.png"
                alt=""
                loading="lazy"
                onerror="this.hidden=true"
              >
            `}
            <span>${medida ? `${this.escaparHTML(medida)} ` : ''}<strong>${this.escaparHTML(nombre)}</strong></span>
          </div>
        `).join('')}
      </div>
    `;
  }

  actualizar(ingredientes) {
    this.ingredientes = this.normalizar(ingredientes);
    this.render();
  }

  destruir() {
    this.contenedor.replaceChildren();
  }
}
