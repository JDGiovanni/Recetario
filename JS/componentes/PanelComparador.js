class PanelComparador {
  constructor(contenedor, panelId, receta = null, opciones = {}) {
    if (!contenedor) {
      throw new TypeError('PanelComparador requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.panelId = panelId;
    this.receta = receta;
    this.opciones = opciones;
    this.render();
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

  solicitarAccion(accion) {
    const callbacks = {
      agregar: this.opciones.onAgregar,
      reemplazar: this.opciones.onReemplazar,
      quitar: this.opciones.onQuitar
    };
    const callback = callbacks[accion];
    const detalle = { panelId: this.panelId, receta: this.receta };

    if (typeof callback === 'function') {
      callback(detalle);
      return;
    }

    this.contenedor.dispatchEvent(new CustomEvent(`comparador:${accion}`, {
      bubbles: true,
      detail: detalle
    }));
  }

  render() {
    const panelId = this.escaparHTML(this.panelId);
    const etiqueta = this.escaparHTML(this.opciones.etiqueta || `Receta ${this.panelId}`);
    const receta = this.receta;
    const contenido = receta
      ? `
        ${receta.strMealThumb
          ? `<img class="panel-receta-imagen" src="${this.escaparHTML(receta.strMealThumb)}" alt="">`
          : ''}
        <div class="panel-receta-info">
          <h3>${this.escaparHTML(receta.strMeal || 'Receta sin nombre')}</h3>
          <p>${[
            receta.strCategory,
            receta.strArea
          ].filter(Boolean).map(valor => this.escaparHTML(valor)).join(' · ') || 'Sin categoría ni origen'}</p>
        </div>
        <div class="panel-receta-acciones">
          <button type="button" class="btn-reemplazar-receta">Reemplazar</button>
          <button type="button" class="btn-quitar-receta">Quitar</button>
        </div>
      `
      : `
        <p class="panel-receta-vacio">Aún no has seleccionado una receta.</p>
        <button type="button" class="btn-agregar-receta">Agregar receta</button>
      `;

    this.contenedor.innerHTML = `
      <section class="panel-receta${receta ? ' panel-receta-ocupado' : ' panel-receta-vacio'}"
        data-panel-id="${panelId}" aria-label="${etiqueta}">
        <h2 class="panel-receta-etiqueta">${etiqueta}</h2>
        ${contenido}
      </section>
    `;

    const acciones = [
      ['.btn-agregar-receta', 'agregar'],
      ['.btn-reemplazar-receta', 'reemplazar'],
      ['.btn-quitar-receta', 'quitar']
    ];
    acciones.forEach(([selector, accion]) => {
      const boton = this.contenedor.querySelector(selector);
      if (boton) {
        boton.addEventListener('click', () => this.solicitarAccion(accion));
      }
    });

    return this.contenedor.firstElementChild;
  }

  actualizar(receta) {
    this.receta = receta || null;
    return this.render();
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}
