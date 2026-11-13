class VistaComparador {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.recetas = Array.isArray(props.comparador) ? [...props.comparador] : [];
    this.busquedas = {};
    this.generacionesBusqueda = { A: 0, B: 0 };
    this.temporizadores = {};
    this.controladores = {};
    this.paneles = {};
    this.render();
  }

  render() {
    this.cancelarBusquedas();
    this.contenedor.innerHTML = `
      <section class="vista-comparador">
        <h1>Comparador de recetas</h1>
        <p>Selecciona hasta dos recetas para revisar sus diferencias.</p>
        <div class="paneles-comparador-grid">
          ${this.renderContenedorPanel('A')}
          ${this.renderContenedorPanel('B')}
        </div>
        <div class="acciones-comparador-central">
          <button type="button" id="btn-intercambiar" class="btn-secundario"
            ${this.recetas.length < 2 ? 'disabled' : ''}>
            Intercambiar recetas
          </button>
        </div>
        <div id="tabla-comparacion-container"></div>
      </section>
    `;

    this.montarPanel('A', 0);
    this.montarPanel('B', 1);
    this.tabla = new TablaComparacion(
      this.contenedor.querySelector('#tabla-comparacion-container'),
      this.recetas
    );
    this.contenedor.querySelector('#btn-intercambiar')
      .addEventListener('click', () => this.intercambiarRecetas());
  }

  renderContenedorPanel(letra) {
    return `
      <section class="panel-comparador" aria-label="Panel ${letra}">
        <h2>Panel ${letra}</h2>
        <div id="panel-${letra.toLowerCase()}"></div>
        <div class="panel-buscador-interno" id="buscador-${letra.toLowerCase()}">
          <label for="input-busqueda-${letra.toLowerCase()}">Buscar receta por nombre</label>
          <input type="search" class="input-busqueda-panel"
            id="input-busqueda-${letra.toLowerCase()}" autocomplete="off"
            aria-controls="sugerencias-${letra.toLowerCase()}"
            placeholder="Escribe al menos 2 caracteres">
          <div class="sugerencias-panel" id="sugerencias-${letra.toLowerCase()}"
            role="listbox" aria-label="Resultados"></div>
        </div>
      </section>
    `;
  }

  montarPanel(letra, indice) {
    const contenedor = this.contenedor.querySelector(`#panel-${letra.toLowerCase()}`);
    const receta = this.recetas[indice] || null;
    this.paneles[letra] = new PanelComparador(contenedor, letra, receta, {
      etiqueta: `Receta ${letra}`,
      onAgregar: () => this.abrirBusqueda(letra),
      onReemplazar: () => this.abrirBusqueda(letra),
      onQuitar: () => this.quitarReceta(indice)
    });

    const buscador = this.contenedor.querySelector(`#buscador-${letra.toLowerCase()}`);
    buscador.hidden = Boolean(receta);
    const input = buscador.querySelector('.input-busqueda-panel');
    input.addEventListener('input', () => this.buscarRecetas(letra, input.value.trim()));
    input.addEventListener('keydown', evento => {
      if (evento.key === 'Escape') {
        input.value = '';
        this.mostrarSugerencias(letra, []);
      }
    });
  }

  abrirBusqueda(letra) {
    const buscador = this.contenedor.querySelector(`#buscador-${letra.toLowerCase()}`);
    if (!buscador) return;
    buscador.hidden = false;
    buscador.querySelector('input').focus();
    this.contenedor.querySelector(`#sugerencias-${letra.toLowerCase()}`).textContent =
      'Busca una receta para agregarla.';
  }

  cancelarBusqueda(letra) {
    clearTimeout(this.temporizadores[letra]);
    this.controladores[letra]?.abort();
    this.generacionesBusqueda[letra]++;
  }

  cancelarBusquedas() {
    ['A', 'B'].forEach(letra => this.cancelarBusqueda(letra));
  }

  async buscarRecetas(letra, consulta) {
    this.cancelarBusqueda(letra);
    const generacion = this.generacionesBusqueda[letra];
    const lista = this.contenedor.querySelector(`#sugerencias-${letra.toLowerCase()}`);
    if (consulta.length < 2) {
      lista.textContent = consulta ? 'Escribe al menos 2 caracteres.' : '';
      return;
    }

    lista.textContent = 'Buscando recetas...';
    this.temporizadores[letra] = setTimeout(async () => {
      const controlador = new AbortController();
      this.controladores[letra] = controlador;
      try {
        const respuesta = await fetch(
          `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(consulta)}`,
          { signal: controlador.signal }
        );
        if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
        const datos = await respuesta.json();
        if (generacion !== this.generacionesBusqueda[letra] || !lista.isConnected) return;
        const recetas = (datos.meals || []).filter(receta =>
          !this.recetas.some((actual, indice) =>
            actual?.idMeal === receta.idMeal && indice !== (letra === 'A' ? 0 : 1)
          )
        );
        this.mostrarSugerencias(letra, recetas);
      } catch (error) {
        if (error.name === 'AbortError' || generacion !== this.generacionesBusqueda[letra]) return;
        console.error('Error al buscar recetas para comparar:', error);
        lista.innerHTML = '<p class="error-texto">No se pudo completar la búsqueda.</p>';
      }
    }, 350);
  }

  mostrarSugerencias(letra, recetas) {
    const lista = this.contenedor.querySelector(`#sugerencias-${letra.toLowerCase()}`);
    if (!lista) return;
    if (!recetas.length) {
      lista.textContent = 'No se encontraron recetas disponibles.';
      return;
    }

    lista.innerHTML = recetas.slice(0, 6).map(receta => `
      <button type="button" class="sugerencia-item" role="option"
        data-id="${this.escaparHTML(receta.idMeal)}">
        ${receta.strMealThumb
          ? `<img src="${this.escaparHTML(receta.strMealThumb)}" alt="" loading="lazy">`
          : ''}
        <span>${this.escaparHTML(receta.strMeal || 'Receta sin nombre')}</span>
      </button>
    `).join('');
    lista.querySelectorAll('[data-id]').forEach(boton => {
      boton.addEventListener('click', () => this.seleccionarReceta(letra, boton.dataset.id));
    });
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

  async seleccionarReceta(letra, id) {
    const indice = letra === 'A' ? 0 : 1;
    const lista = this.contenedor.querySelector(`#sugerencias-${letra.toLowerCase()}`);
    lista.textContent = 'Cargando receta...';
    try {
      const respuesta = await fetch(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`
      );
      if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
      const datos = await respuesta.json();
      const receta = datos.meals?.[0];
      if (!receta) throw new Error('No se encontró el detalle de la receta.');

      const otras = this.recetas.filter((actual, posicion) =>
        posicion !== indice && actual?.idMeal === receta.idMeal
      );
      if (otras.length) {
        this.mostrarMensaje('No puedes comparar una receta consigo misma.');
        return;
      }

      const nuevas = [...this.recetas];
      nuevas[indice] = receta;
      this.publicarCambio(nuevas.filter(Boolean));
    } catch (error) {
      console.error('Error al cargar receta para comparar:', error);
      this.mostrarMensaje('No se pudo cargar la receta seleccionada.');
    }
  }

  quitarReceta(indice) {
    const nuevas = [...this.recetas];
    nuevas.splice(indice, 1);
    this.publicarCambio(nuevas);
  }

  intercambiarRecetas() {
    if (this.recetas.length !== 2) return;
    this.publicarCambio([this.recetas[1], this.recetas[0]]);
  }

  publicarCambio(recetas) {
    this.recetas = recetas;
    if (typeof this.props.alCambiarComparador === 'function') {
      this.props.alCambiarComparador([...recetas]);
    } else {
      this.render();
    }
  }

  actualizar(recetas) {
    this.recetas = Array.isArray(recetas) ? [...recetas].slice(0, 2) : [];
    this.render();
  }

  mostrarMensaje(mensaje) {
    window.dispatchEvent(new CustomEvent('app:mensaje', { detail: { mensaje } }));
  }

  destruir() {
    this.cancelarBusquedas();
    Object.values(this.paneles).forEach(panel => panel?.destruir());
    this.tabla?.destruir();
    this.contenedor.replaceChildren();
  }
}
