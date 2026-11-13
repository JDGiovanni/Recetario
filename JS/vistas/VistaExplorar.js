class VistaExplorar {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      criterios: { nombre: '', categoria: '', origen: '', ingrediente: '' },
      resultadosCompletos: [],
      paginaActual: 1,
      porPagina: 12
    };
    this.tarjetas = [];
    this.busquedaActual = 0;
    this.render();
  }

  render() {
    this.contenedor.innerHTML = `
      <section class="vista-explorar">
        <h1>Explorar recetas</h1>
        <div id="formulario-busqueda-container"></div>
        <div id="resultados-info" class="resultados-info" aria-live="polite"></div>
        <div id="resultados-grid" class="grid-tarjetas"></div>
        <div id="paginador-container"></div>
      </section>
    `;

    this.formularioContainer = this.contenedor.querySelector('#formulario-busqueda-container');
    this.resultadosGrid = this.contenedor.querySelector('#resultados-grid');
    this.resultadosInfo = this.contenedor.querySelector('#resultados-info');
    this.paginadorContainer = this.contenedor.querySelector('#paginador-container');
    this.estadoCargaFiltros = new EstadoCarga(this.formularioContainer);
    this.estadoCargaFiltros.mostrarCargando('Cargando filtros...');
    this.cargarFiltros();
  }

  async obtenerJSON(url) {
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`La solicitud falló (${respuesta.status}).`);
    return respuesta.json();
  }

  async cargarFiltros() {
    try {
      const [categorias, origenes] = await Promise.all([
        this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/categories.php'),
        this.obtenerJSON('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
      ]);
      if (!this.contenedor.isConnected) return;
      this.formularioBusqueda = new FormularioBusqueda(this.formularioContainer, {
        categorias: categorias.categories || [],
        origenes: origenes.meals || [],
        onBuscar: criterios => this.ejecutarBusqueda(criterios),
        onLimpiar: () => this.limpiarResultados()
      });
      this.formularioBusqueda.montar();
    } catch (error) {
      console.error('Error al cargar filtros de exploración:', error);
      this.estadoCargaFiltros.mostrarError(
        'No se pudieron cargar las opciones de búsqueda.',
        () => this.cargarFiltros()
      );
    }
  }

  limpiarTarjetas() {
    this.tarjetas.forEach(tarjeta => tarjeta.destruir?.());
    this.tarjetas = [];
  }

  limpiarResultados() {
    this.busquedaActual++;
    this.estado.resultadosCompletos = [];
    this.estado.paginaActual = 1;
    this.limpiarTarjetas();
    this.resultadosGrid.replaceChildren();
    this.resultadosInfo.textContent = '';
    this.paginadorContainer.replaceChildren();
  }

  async ejecutarBusqueda(criterios) {
    this.estado.criterios = criterios;
    this.estado.paginaActual = 1;
    const busqueda = ++this.busquedaActual;
    this.limpiarTarjetas();
    this.resultadosInfo.textContent = '';
    this.paginadorContainer.replaceChildren();
    this.estadoCargaResultados = new EstadoCarga(this.resultadosGrid);
    this.estadoCargaResultados.mostrarCargando('Buscando recetas...');

    try {
      const consultas = [];
      if (criterios.nombre) {
        consultas.push(`search.php?s=${encodeURIComponent(criterios.nombre)}`);
      }
      if (criterios.categoria) {
        consultas.push(`filter.php?c=${encodeURIComponent(criterios.categoria)}`);
      }
      if (criterios.origen) {
        consultas.push(`filter.php?a=${encodeURIComponent(criterios.origen)}`);
      }
      if (criterios.ingrediente) {
        consultas.push(`filter.php?i=${encodeURIComponent(criterios.ingrediente)}`);
      }

      const respuestas = await Promise.all(consultas.map(endpoint =>
        this.obtenerJSON(`https://www.themealdb.com/api/json/v1/1/${endpoint}`)
      ));
      if (busqueda !== this.busquedaActual || !this.contenedor.isConnected) return;

      const listas = respuestas.map(respuesta => respuesta.meals || []);
      if (listas.some(lista => lista.length === 0)) {
        this.estado.resultadosCompletos = [];
      } else {
        let coincidencias = listas[0];
        listas.slice(1).forEach(lista => {
          const ids = new Set(lista.map(receta => receta.idMeal));
          coincidencias = coincidencias.filter(receta => ids.has(receta.idMeal));
        });
        this.estado.resultadosCompletos = coincidencias
          .sort((a, b) => String(a.strMeal).localeCompare(String(b.strMeal)));
      }

      this.renderizarResultados();
    } catch (error) {
      if (busqueda !== this.busquedaActual) return;
      console.error('Error en búsqueda:', error);
      this.resultadosGrid.innerHTML = `
        <div class="error-banner" role="alert">
          <p>No se pudo completar la búsqueda. Comprueba tu conexión e inténtalo otra vez.</p>
          <button type="button" class="btn-primario btn-reintentar">Reintentar</button>
        </div>
      `;
      this.resultadosGrid.querySelector('.btn-reintentar')
        .addEventListener('click', () => this.ejecutarBusqueda(this.estado.criterios));
    }
  }

  async obtenerDetalle(id) {
    const datos = await this.obtenerJSON(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`
    );
    return datos.meals?.[0] || null;
  }

  async agregarAlComparador(receta, boton) {
    if (boton) boton.disabled = true;
    try {
      const completa = receta.strInstructions ? receta : await this.obtenerDetalle(receta.idMeal);
      if (!completa) throw new Error('No se encontró el detalle de la receta.');
      window.dispatchEvent(new CustomEvent('app:agregar-comparador', {
        detail: { receta: completa }
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

  renderizarResultados() {
    this.limpiarTarjetas();
    this.resultadosGrid.replaceChildren();
    this.paginadorContainer.replaceChildren();

    const total = this.estado.resultadosCompletos.length;
    if (!total) {
      this.resultadosInfo.textContent = '';
      this.resultadosGrid.innerHTML = '<div class="estado-vacio"><p>No se encontraron recetas con esos criterios.</p></div>';
      return;
    }

    this.resultadosInfo.innerHTML = `Se encontraron <strong>${total}</strong> recetas.`;
    const inicio = (this.estado.paginaActual - 1) * this.estado.porPagina;
    const recetas = this.estado.resultadosCompletos.slice(inicio, inicio + this.estado.porPagina);
    recetas.forEach(receta => {
      const elemento = document.createElement('div');
      this.resultadosGrid.appendChild(elemento);
      const tarjeta = new TarjetaReceta(elemento, receta, {
        onComparar: (seleccionada) => {
          const boton = elemento.querySelector('.btn-comparar-card');
          this.agregarAlComparador(seleccionada, boton);
        }
      });
      tarjeta.montar();
      this.tarjetas.push(tarjeta);
    });

    this.paginador = new Paginador(this.paginadorContainer, {
      totalElementos: total,
      porPagina: this.estado.porPagina,
      paginaActual: this.estado.paginaActual,
      alCambiar: pagina => {
        this.estado.paginaActual = pagina;
        this.renderizarResultados();
      }
    });
    this.paginador.montar();
  }

  destruir() {
    this.busquedaActual++;
    this.limpiarTarjetas();
    this.estadoCargaFiltros?.destruir();
    this.estadoCargaResultados?.destruir();
    this.contenedor.replaceChildren();
  }
}
