class TarjetaReceta {
  constructor(contenedor, receta, opciones = {}) {
    if (!contenedor) {
      throw new TypeError('TarjetaReceta requiere un contenedor.');
    }
    if (!receta || typeof receta !== 'object') {
      throw new TypeError('TarjetaReceta requiere una receta válida.');
    }

    this.contenedor = contenedor;
    this.receta = receta;
    this.opciones = opciones;
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
    const id = this.escaparHTML(this.receta.idMeal || '');
    const nombre = this.escaparHTML(this.receta.strMeal || 'Receta sin nombre');
    const imagen = this.escaparHTML(this.receta.strMealThumb || '');
    const categoria = this.escaparHTML(this.receta.strCategory || '');
    const origen = this.escaparHTML(this.receta.strArea || '');
    const mostrarComparar = this.opciones.mostrarComparar !== false;
    const detalles = id
      ? `<a href="#detalle/${id}" class="btn-secundario" data-link>Ver detalle</a>`
      : '';
    const comparar = mostrarComparar
      ? `<button type="button" class="btn-comparar-card">Comparar</button>`
      : '';
    const metadatos = [categoria, origen]
      .filter(Boolean)
      .map(dato => `<span class="badge">${dato}</span>`)
      .join('');

    return `
      <article class="tarjeta-receta" data-id="${id}">
        ${imagen ? `<img src="${imagen}" alt="${nombre}" loading="lazy">` : ''}
        <div class="tarjeta-body">
          ${metadatos ? `<div class="tarjeta-metadatos">${metadatos}</div>` : ''}
          <h3>${nombre}</h3>
          <div class="tarjeta-acciones-inferior">
            ${detalles}
            ${comparar}
          </div>
        </div>
      </article>
    `;
  }

  montar() {
    this.contenedor.innerHTML = this.render();

    const botonComparar = this.contenedor.querySelector('.btn-comparar-card');
    if (botonComparar) {
      botonComparar.addEventListener('click', () => {
        if (typeof this.opciones.onComparar === 'function') {
          this.opciones.onComparar(this.receta);
          return;
        }

        window.dispatchEvent(new CustomEvent('app:agregar-comparador', {
          detail: { receta: this.receta }
        }));
      });
    }

    return this.contenedor.firstElementChild;
  }
}
