class VistaInicio {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = { recetaDestacada: null, categorias: [] };
    this.tarjetaDestacada = null;
    this.generacion = 0;
    this.render();
  }

  render() {
    this.contenedor.innerHTML = `
      <section class="vista-inicio">
        <div class="destacada-section">
          <h2>Receta destacada del día</h2>
          <div id="inicio-destacada" class="tarjeta-destacada"></div>
          <button type="button" id="btn-otra-receta" class="btn-secundario">Otra receta</button>
        </div>
        <section class="categorias-section">
          <h2>Explora por categorías</h2>
          <div id="inicio-categorias" class="grid-categorias"></div>
        </section>
      </section>
    `;

    this.contenedor.querySelector('#btn-otra-receta')
      .addEventListener('click', () => this.cargarRecetaDestacadaUnica());
    this.estadoCargaDestacada = new EstadoCarga(this.contenedor.querySelector('#inicio-destacada'));
    this.estadoCargaCategorias = new EstadoCarga(this.contenedor.querySelector('#inicio-categorias'));
    this.estadoCargaDestacada.mostrarCargando('Cargando receta destacada...');
    this.estadoCargaCategorias.mostrarCargando('Cargando categorías...');
    this.cargarDatos();
  }

  async obtenerJSON(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
    return respuesta.json();
  }

  async cargarDatos() {
    const generacion = ++this.generacion;
    const resultados = await Promise.allSettled([
      this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/random.php'),
      this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/categories.php')
    ]);
    if (generacion !== this.generacion || !this.contenedor.isConnected) return;

    const [receta, categorias] = resultados;
    if (receta.status === 'fulfilled' && receta.value.meals?.[0]) {
      this.mostrarDestacada(receta.value.meals[0]);
    } else {
      this.estadoCargaDestacada.mostrarError(
        'No se pudo cargar la receta destacada.',
        () => this.cargarDatos()
      );
    }

    if (categorias.status === 'fulfilled' && Array.isArray(categorias.value.categories)) {
      this.estado.categorias = categorias.value.categories;
      this.mostrarCategorias();
    } else {
      this.estadoCargaCategorias.mostrarError(
        'No se pudieron cargar las categorías.',
        () => this.cargarCategorias()
      );
    }
  }

  async cargarCategorias() {
    try {
      const datos = await this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/categories.php');
      if (!this.contenedor.isConnected) return;
      this.estado.categorias = datos.categories || [];
      this.mostrarCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.estadoCargaCategorias.mostrarError(
        'No se pudieron cargar las categorías.',
        () => this.cargarCategorias()
      );
    }
  }

  mostrarDestacada(receta) {
    const contenedor = this.contenedor.querySelector('#inicio-destacada');
    if (!contenedor) return;
    this.estado.recetaDestacada = receta;
    this.recetaAnteriorId = receta.idMeal;
    this.tarjetaDestacada?.destruir?.();
    this.tarjetaDestacada = new TarjetaReceta(contenedor, receta);
    this.tarjetaDestacada.montar();
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

  mostrarCategorias() {
    const contenedor = this.contenedor.querySelector('#inicio-categorias');
    if (!contenedor) return;
    if (!this.estado.categorias.length) {
      contenedor.innerHTML = '<p class="estado-vacio">No hay categorías disponibles.</p>';
      return;
    }

    contenedor.innerHTML = this.estado.categorias.map(categoria => `
      <button type="button" class="card-categoria" data-categoria="${this.escaparHTML(categoria.strCategory)}">
        ${categoria.strCategoryThumb
          ? `<img src="${this.escaparHTML(categoria.strCategoryThumb)}" alt="" loading="lazy">`
          : ''}
        <span>${this.escaparHTML(categoria.strCategory)}</span>
      </button>
    `).join('');
    contenedor.querySelectorAll('[data-categoria]').forEach(boton => {
      boton.addEventListener('click', () => {
        window.location.hash = `#categorias/cat/${encodeURIComponent(boton.dataset.categoria)}`;
      });
    });
  }

  async cargarRecetaDestacadaUnica() {
    const boton = this.contenedor.querySelector('#btn-otra-receta');
    if (boton) boton.disabled = true;
    this.estadoCargaDestacada.mostrarCargando('Buscando otra receta...');
    try {
      let receta = null;
      for (let intento = 0; intento < 3; intento++) {
        const datos = await this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/random.php');
        receta = datos.meals?.[0] || null;
        if (receta && receta.idMeal !== this.recetaAnteriorId) break;
      }
      if (!receta) throw new Error('No se encontró una receta.');
      if (this.contenedor.isConnected) this.mostrarDestacada(receta);
    } catch (error) {
      console.error('Error al cargar otra receta:', error);
      this.estadoCargaDestacada.mostrarError(
        'No se pudo obtener otra receta.',
        () => this.cargarRecetaDestacadaUnica()
      );
    } finally {
      if (boton?.isConnected) boton.disabled = false;
    }
  }

  destruir() {
    this.generacion++;
    this.tarjetaDestacada?.destruir?.();
    this.estadoCargaDestacada?.destruir();
    this.estadoCargaCategorias?.destruir();
    this.contenedor.replaceChildren();
  }
}
