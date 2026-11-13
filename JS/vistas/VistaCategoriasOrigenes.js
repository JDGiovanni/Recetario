class VistaCategoriasOrigenes {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      pestanaActiva: props.tipo === 'origenes' ? 'origenes' : 'categorias',
      categorias: [],
      origenes: [],
      seleccionActual: props.seleccion || null,
      recetasFiltro: [],
      paginaActual: 1
    };
    this.generacion = 0;
    this.tarjetas = [];
    this.render();
  }

  render() {
    this.contenedor.innerHTML = `
      <section class="vista-cat-origen">
        <h1>Categorías y orígenes</h1>
        <div class="pestanas-nav" role="tablist" aria-label="Explorar por">
          <button type="button" id="tab-categorias" class="btn-pestana" role="tab">Categorías</button>
          <button type="button" id="tab-origenes" class="btn-pestana" role="tab">Orígenes</button>
        </div>
        <div id="contenido-pestana" class="contenido-pestana-container"></div>
      </section>
    `;
    this.contenido = this.contenedor.querySelector('#contenido-pestana');
    this.estadoCarga = new EstadoCarga(this.contenido);
    this.estadoCarga.mostrarCargando('Cargando categorías y orígenes...');
    this.contenedor.querySelector('#tab-categorias')
      .addEventListener('click', () => this.cambiarPestana('categorias'));
    this.contenedor.querySelector('#tab-origenes')
      .addEventListener('click', () => this.cambiarPestana('origenes'));
    this.cargarDatosIniciales();
  }

  async obtenerJSON(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
    return respuesta.json();
  }

  async cargarDatosIniciales() {
    try {
      const [categorias, origenes] = await Promise.all([
        this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/categories.php'),
        this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
      ]);
      if (!this.contenedor.isConnected) return;
      this.estado.categorias = categorias.categories || [];
      this.estado.origenes = origenes.meals || [];
      this.actualizarPestanas();
      this.renderizarContenido();
    } catch (error) {
      console.error('Error al cargar categorías y orígenes:', error);
      this.estadoCarga.mostrarError(
        'No se pudieron cargar las categorías y orígenes.',
        () => this.cargarDatosIniciales()
      );
    }
  }

  actualizarPestanas() {
    const categoriaActiva = this.estado.pestanaActiva === 'categorias';
    const categorias = this.contenedor.querySelector('#tab-categorias');
    const origenes = this.contenedor.querySelector('#tab-origenes');
    categorias.classList.toggle('activa', categoriaActiva);
    origenes.classList.toggle('activa', !categoriaActiva);
    categorias.setAttribute('aria-selected', String(categoriaActiva));
    origenes.setAttribute('aria-selected', String(!categoriaActiva));
  }

  cambiarPestana(pestana) {
    this.generacion++;
    this.estado.pestanaActiva = pestana;
    this.estado.seleccionActual = null;
    this.estado.paginaActual = 1;
    this.actualizarPestanas();
    this.renderizarContenido();
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

  renderizarContenido() {
    this.limpiarTarjetas();
    if (this.estado.seleccionActual) {
      this.cargarRecetasFiltradas();
      return;
    }

    if (this.estado.pestanaActiva === 'categorias') {
      this.contenido.innerHTML = `
        <div class="grid-categorias">
          ${this.estado.categorias.map(categoria => `
            <button type="button" class="card-categoria" data-nombre="${this.escaparHTML(categoria.strCategory)}">
              ${categoria.strCategoryThumb
                ? `<img src="${this.escaparHTML(categoria.strCategoryThumb)}" alt="" loading="lazy">`
                : ''}
              <span>${this.escaparHTML(categoria.strCategory)}</span>
            </button>
          `).join('')}
        </div>
      `;
    } else {
      this.contenido.innerHTML = `
        <div class="grid-origenes">
          ${this.estado.origenes.map(origen => `
            <button type="button" class="card-origen" data-nombre="${this.escaparHTML(origen.strArea)}">
              ${this.escaparHTML(origen.strArea)}
            </button>
          `).join('')}
        </div>
      `;
    }

    this.contenido.querySelectorAll('[data-nombre]').forEach(boton => {
      boton.addEventListener('click', () => {
        this.estado.seleccionActual = boton.dataset.nombre;
        this.estado.paginaActual = 1;
        this.cargarRecetasFiltradas();
      });
    });
  }

  async cargarRecetasFiltradas() {
    const generacion = ++this.generacion;
    const nombre = this.estado.seleccionActual;
    const tipo = this.estado.pestanaActiva === 'categorias' ? 'c' : 'a';
    this.contenido.innerHTML = `
      <button type="button" id="btn-volver-lista" class="btn-secundario">Volver al listado</button>
      <h2>Recetas de: ${this.escaparHTML(nombre)}</h2>
      <div id="grid-recetas-filtro" class="grid-tarjetas"></div>
      <div id="paginador-categorias"></div>
    `;
    this.contenido.querySelector('#btn-volver-lista').addEventListener('click', () => {
      this.generacion++;
      this.estado.seleccionActual = null;
      this.renderizarContenido();
    });

    const grid = this.contenido.querySelector('#grid-recetas-filtro');
    this.estadoCargaRecetas = new EstadoCarga(grid);
    this.estadoCargaRecetas.mostrarCargando('Cargando recetas...');
    try {
      const datos = await this.obtenerJSON(
        `https://www.themealdb.com/api/json/v1/1/filter.php?${tipo}=${encodeURIComponent(nombre)}`
      );
      if (generacion !== this.generacion || !grid.isConnected) return;
      this.estado.recetasFiltro = datos.meals || [];
      this.mostrarPaginaRecetas();
    } catch (error) {
      if (generacion !== this.generacion) return;
      console.error('Error al cargar recetas filtradas:', error);
      this.estadoCargaRecetas.mostrarError(
        'No se pudieron cargar las recetas.',
        () => this.cargarRecetasFiltradas()
      );
    }
  }

  async agregarAlComparador(receta, boton) {
    if (boton) boton.disabled = true;
    try {
      let recetaCompleta = receta;
      if (!receta.strInstructions) {
        const datos = await this.obtenerJSON(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(receta.idMeal)}`
        );
        recetaCompleta = datos.meals?.[0];
      }
      if (!recetaCompleta) throw new Error('No se encontró el detalle de la receta.');
      window.dispatchEvent(new CustomEvent('app:agregar-comparador', {
        detail: { receta: recetaCompleta }
      }));
    } catch (error) {
      console.error('No se pudo agregar la receta al comparador:', error);
      window.dispatchEvent(new CustomEvent('app:mensaje', {
        detail: { mensaje: 'No se pudo cargar la receta para compararla.' }
      }));
    } finally {
      if (boton?.isConnected) boton.disabled = false;
    }
  }

  mostrarPaginaRecetas() {
    const grid = this.contenido.querySelector('#grid-recetas-filtro');
    const paginadorElemento = this.contenido.querySelector('#paginador-categorias');
    this.limpiarTarjetas();
    grid.replaceChildren();
    paginadorElemento.replaceChildren();
    const total = this.estado.recetasFiltro.length;
    if (!total) {
      grid.innerHTML = '<p class="estado-vacio">No hay recetas disponibles.</p>';
      return;
    }

    const inicio = (this.estado.paginaActual - 1) * 12;
    this.estado.recetasFiltro.slice(inicio, inicio + 12).forEach(receta => {
      const elemento = document.createElement('div');
      grid.appendChild(elemento);
      const tarjeta = new TarjetaReceta(elemento, receta, {
        onComparar: seleccionada => this.agregarAlComparador(
          seleccionada,
          elemento.querySelector('.btn-comparar-card')
        )
      });
      tarjeta.montar();
      this.tarjetas.push(tarjeta);
    });
    this.paginador = new Paginador(paginadorElemento, {
      totalElementos: total,
      porPagina: 12,
      paginaActual: this.estado.paginaActual,
      alCambiar: pagina => {
        this.estado.paginaActual = pagina;
        this.mostrarPaginaRecetas();
      }
    });
    this.paginador.montar();
  }

  limpiarTarjetas() {
    this.tarjetas.forEach(tarjeta => tarjeta.destruir?.());
    this.tarjetas = [];
  }

  destruir() {
    this.generacion++;
    this.limpiarTarjetas();
    this.estadoCarga?.destruir();
    this.estadoCargaRecetas?.destruir();
    this.contenedor.replaceChildren();
  }
}
