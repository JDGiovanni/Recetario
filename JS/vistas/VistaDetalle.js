class VistaDetalle {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.idReceta = props.id || null;
    this.generacion = 0;
    this.tarjetasRelacionadas = [];
    this.componentesDetalle = [];
    this.render();
  }

  render() {
    this.contenedor.innerHTML = `
      <section class="vista-detalle">
        <button type="button" id="btn-volver-detalle" class="btn-secundario">Volver</button>
        <div id="detalle-carga"></div>
        <div id="detalle-error" class="hidden"></div>
        <div id="detalle-contenido" class="hidden"></div>
      </section>
    `;
    this.estadoCarga = new EstadoCarga(this.contenedor.querySelector('#detalle-carga'));
    this.estadoCarga.mostrarCargando('Cargando detalles de la receta...');
    this.contenedor.querySelector('#btn-volver-detalle')
      .addEventListener('click', () => this.volver());

    if (!this.idReceta) {
      this.mostrarError('No se especificó una receta válida.');
    } else {
      this.cargarReceta();
    }
  }

  volver() {
    if (typeof this.props.volver === 'function') this.props.volver();
    else window.location.hash = '#explorar';
  }

  async obtenerJSON(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
    return respuesta.json();
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

  async cargarReceta() {
    const generacion = ++this.generacion;
    try {
      const datos = await this.obtenerJSON(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(this.idReceta)}`
      );
      if (generacion !== this.generacion || !this.contenedor.isConnected) return;
      const receta = datos.meals?.[0];
      if (!receta) {
        this.estadoCarga.destruir();
        this.mostrarError('No se encontró la receta solicitada.');
        return;
      }

      this.receta = receta;
      this.estadoCarga.destruir();
      this.renderizarReceta(receta);
      this.cargarRelacionadas(receta.strCategory, receta.strArea, generacion);
    } catch (error) {
      if (generacion !== this.generacion) return;
      console.error('Error al cargar la receta:', error);
      this.estadoCarga.destruir();
      this.mostrarError('No se pudo cargar la receta. Comprueba tu conexión e inténtalo de nuevo.');
    }
  }

  obtenerIngredientes(receta) {
    const ingredientes = [];
    for (let indice = 1; indice <= 20; indice++) {
      const nombre = String(receta[`strIngredient${indice}`] || '').trim();
      if (nombre) {
        ingredientes.push({
          nombre,
          medida: String(receta[`strMeasure${indice}`] || '').trim()
        });
      }
    }
    return ingredientes;
  }

  obtenerURLYoutube(valor) {
    if (!valor) return null;
    try {
      const url = new URL(valor);
      return ['www.youtube.com', 'youtube.com', 'youtu.be'].includes(url.hostname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  }

  renderizarReceta(receta) {
    const contenido = this.contenedor.querySelector('#detalle-contenido');
    const nombre = this.escaparHTML(receta.strMeal || 'Receta sin nombre');
    const imagen = this.escaparHTML(receta.strMealThumb || '');
    const tags = String(receta.strTags || '').split(',').map(tag => tag.trim()).filter(Boolean);
    const youtube = this.obtenerURLYoutube(receta.strYoutube);

    contenido.innerHTML = `
      <article class="detalle-receta">
        <header class="detalle-header">
          ${imagen ? `<img src="${imagen}" alt="${nombre}" loading="lazy">` : ''}
          <div class="detalle-info-principal">
            <h1>${nombre}</h1>
            <p><strong>Categoría:</strong> ${this.escaparHTML(receta.strCategory || 'No especificada')}</p>
            <p><strong>Origen:</strong> ${this.escaparHTML(receta.strArea || 'No especificado')}</p>
            <div class="tags-container">
              ${tags.map(tag => `<span class="badge">${this.escaparHTML(tag)}</span>`).join('')}
            </div>
            <button type="button" id="btn-comparar-detalle" class="btn-primario">
              Agregar al comparador
            </button>
          </div>
        </header>
        <div class="detalle-secciones">
          <section class="columna-ingredientes">
            <h2>Ingredientes</h2>
            <div id="detalle-ingredientes"></div>
          </section>
          <section class="columna-pasos">
            <h2>Preparación</h2>
            <div id="detalle-pasos"></div>
            ${youtube
              ? `<a href="${this.escaparHTML(youtube)}" target="_blank" rel="noopener noreferrer" class="btn-primario">Ver video</a>`
              : ''}
          </section>
        </div>
        <section class="relacionadas-section">
          <h2>Recetas relacionadas</h2>
          <div id="relacionadas-grid" class="grid-tarjetas"></div>
        </section>
      </article>
    `;
    contenido.classList.remove('hidden');

    const ingredientes = new ListaIngredientes(
      contenido.querySelector('#detalle-ingredientes'),
      this.obtenerIngredientes(receta)
    );
    const pasos = new PasosPreparacion(
      contenido.querySelector('#detalle-pasos'),
      receta.strInstructions || ''
    );
    this.componentesDetalle.push(ingredientes, pasos);
    contenido.querySelector('#btn-comparar-detalle').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app:agregar-comparador', {
        detail: { receta }
      }));
    });
  }

  async cargarRelacionadas(categoria, origen, generacion) {
    const grid = this.contenedor.querySelector('#relacionadas-grid');
    if (!grid) return;
    const carga = new EstadoCarga(grid);
    carga.mostrarCargando('Cargando recetas relacionadas...');
    try {
      const urls = [];
      if (categoria) {
        urls.push(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(categoria)}`);
      }
      if (origen) {
        urls.push(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(origen)}`);
      }
      const respuestas = await Promise.allSettled(urls.map(url => this.obtenerJSON(url)));
      if (generacion !== this.generacion || !grid.isConnected) return;

      const unicas = new Map();
      respuestas.forEach(respuesta => {
        if (respuesta.status === 'fulfilled') {
          (respuesta.value.meals || []).forEach(receta => unicas.set(receta.idMeal, receta));
        }
      });
      const recetas = [...unicas.values()]
        .filter(receta => receta.idMeal !== this.idReceta)
        .slice(0, 6);
      if (!recetas.length) {
        grid.innerHTML = '<p>No hay recetas relacionadas disponibles.</p>';
        return;
      }

      grid.replaceChildren();
      recetas.forEach(receta => {
        const elemento = document.createElement('div');
        grid.appendChild(elemento);
        const tarjeta = new TarjetaReceta(elemento, receta, { mostrarComparar: false });
        tarjeta.montar();
        this.tarjetasRelacionadas.push(tarjeta);
      });
    } catch (error) {
      console.error('Error al cargar recetas relacionadas:', error);
      if (grid.isConnected) {
        grid.innerHTML = '<p class="error-texto">No se pudieron cargar las recetas relacionadas.</p>';
      }
    }
  }

  mostrarError(mensaje) {
    const error = this.contenedor.querySelector('#detalle-error');
    if (!error) return;
    error.classList.remove('hidden');
    error.innerHTML = `<p class="error-texto">${this.escaparHTML(mensaje)}</p>`;
  }

  destruir() {
    this.generacion++;
    this.componentesDetalle.forEach(componente => componente.destruir?.());
    this.tarjetasRelacionadas.forEach(tarjeta => tarjeta.destruir?.());
    this.estadoCarga?.destruir();
    this.contenedor.replaceChildren();
  }
}
