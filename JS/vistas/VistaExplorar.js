class VistaExplorar {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      criterios: { nombre: '', categoria: '', origen: '', ingrediente: '' },
      resultadosCompletos: [],
      paginaActual: 1,
      porPagina: 12,
      cargando: false
    };
    this.render();
  }

  render() {
    this.contenedor.innerHTML = `
      <section class="vista-explorar">
        <h2>Explorar Recetas</h2>
        <div id="formulario-busqueda-container"></div>
        <div id="resultados-info" class="resultados-info"></div>
        <div id="resultados-grid" class="grid-tarjetas"></div>
        <div id="paginador-container"></div>
      </section>
    `;

    this.inicializarFormulario();
  }

  inicializarFormulario() {
    const container = document.getElementById('formulario-busqueda-container');
    container.innerHTML = `
      <form id="form-explorar" class="form-explorar">
        <div class="campo-grupo">
          <label>Nombre:</label>
          <input type="text" id="filtro-nombre" placeholder="Ej. Arrabiata">
        </div>
        <div class="campo-grupo">
          <label>Categoría:</label>
          <select id="filtro-categoria">
            <option value="">Todas las categorías</option>
          </select>
        </div>
        <div class="campo-grupo">
          <label>Origen:</label>
          <select id="filtro-origen">
            <option value="">Todos los orígenes</option>
          </select>
        </div>
        <div class="campo-grupo">
          <label>Ingrediente:</label>
          <input type="text" id="filtro-ingrediente" placeholder="Ej. Chicken">
        </div>
        <div class="form-acciones">
          <button type="submit" class="btn-primario">Buscar</button>
          <button type="button" id="btn-limpiar" class="btn-secundario">Limpiar</button>
        </div>
      </form>
      <div id="mensaje-validacion" class="mensaje-validacion"></div>
    `;

    this.cargarSelectsFiltros();
    this.configurarEventosFormulario();
  }

  async cargarSelectsFiltros() {
    try {
      const [resCat, resArea] = await Promise.all([
        fetch('https://www.themealdb.com/api/json/v1/1/categories.php').then(r => r.json()),
        fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list').then(r => r.json())
      ]);

      const selectCat = document.getElementById('filtro-categoria');
      if (resCat.categories && selectCat) {
        resCat.categories.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.strCategory;
          opt.textContent = c.strCategory;
          selectCat.appendChild(opt);
        });
      }

      const selectArea = document.getElementById('filtro-origen');
      if (resArea.meals && selectArea) {
        resArea.meals.forEach(a => {
          const opt = document.createElement('option');
          opt.value = a.strArea;
          opt.textContent = a.strArea;
          selectArea.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Error cargando filtros de exploración:', e);
    }
  }

  configurarEventosFormulario() {
    const form = document.getElementById('form-explorar');
    const btnLimpiar = document.getElementById('btn-limpiar');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.ejecutarBusqueda();
    });

    btnLimpiar.addEventListener('click', () => {
      form.reset();
      this.estado.resultadosCompletos = [];
      this.estado.paginaActual = 1;
      document.getElementById('resultados-grid').innerHTML = '';
      document.getElementById('resultados-info').innerHTML = '';
      document.getElementById('mensaje-validacion').textContent = '';
      document.getElementById('paginador-container').innerHTML = '';
    });
  }

  async ejecutarBusqueda() {
    const nombre = document.getElementById('filtro-nombre').value.trim();
    const categoria = document.getElementById('filtro-categoria').value;
    const origen = document.getElementById('filtro-origen').value;
    const ingrediente = document.getElementById('filtro-ingrediente').value.trim();
    const valMsg = document.getElementById('mensaje-validacion');

    if (!nombre && !categoria && !origen && !ingrediente) {
      valMsg.textContent = 'Debes indicar al menos un criterio de búsqueda.';
      return;
    }

    valMsg.textContent = '';
    this.estado.criterios = { nombre, categoria, origen, ingrediente };
    this.estado.paginaActual = 1;

    const grid = document.getElementById('resultados-grid');
    grid.innerHTML = '<div class="skeleton-loader">Buscando recetas en paralelo...</div>';

    try {
      const promesas = [];
      if (nombre) promesas.push(fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(nombre)}`).then(r => r.json()));
      if (categoria) promesas.push(fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(categoria)}`).then(r => r.json()));
      if (origen) promesas.push(fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(origen)}`).then(r => r.json()));
      if (ingrediente) promesas.push(fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingrediente)}`).then(r => r.json()));

      const resultados = await Promise.all(promesas);
      let listasRecetas = resultados.map(res => res.meals || []);
      
      if (listasRecetas.some(lista => lista === null || lista.length === 0)) {
        this.estado.resultadosCompletos = [];
      } else {
        let interseccion = listasRecetas[0];
        for (let i = 1; i < listasRecetas.length; i++) {
          const idsActuales = new Set(listasRecetas[i].map(r => r.idMeal));
          interseccion = interseccion.filter(r => idsActuales.has(r.idMeal));
        }

        interseccion.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
        this.estado.resultadosCompletos = interseccion;
      }

      this.renderizarResultados();

    } catch (error) {
      console.error('Error en búsqueda:', error);
      grid.innerHTML = '<p class="error-texto">Ocurrió un error al realizar la búsqueda. Comprueba tu conexión.</p>';
    }
  }

  async renderizarResultados() {
    const grid = document.getElementById('resultados-grid');
    const info = document.getElementById('resultados-info');
    const paginadorContainer = document.getElementById('paginador-container');

    const total = this.estado.resultadosCompletos.length;
    if (total === 0) {
      info.innerHTML = '';
      grid.innerHTML = '<div class="estado-vacio"><p>No se encontraron recetas con los criterios especificados.</p></div>';
      paginadorContainer.innerHTML = '';
      return;
    }

    info.innerHTML = `<p>Se encontraron <strong>${total}</strong> recetas.</p>`;

    const inicio = (this.estado.paginaActual - 1) * this.estado.porPagina;
    const fin = inicio + this.estado.porPagina;
    const paginaRecetas = this.estado.resultadosCompletos.slice(inicio, fin);

    grid.innerHTML = paginaRecetas.map(r => `
      <div class="tarjeta-receta" data-id="${r.idMeal}">
        <img src="${r.strMealThumb}" alt="${r.strMeal}" loading="lazy">
        <div class="tarjeta-body">
          <h4>${r.strMeal}</h4>
          <div class="tarjeta-acciones-inferior">
            <a href="#detalle/${r.idMeal}" class="btn-secundario" data-link>Ver Detalle</a>
            <button class="btn-comparar-card" data-id="${r.idMeal}">Comparar</button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.btn-comparar-card').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        const recetaFull = await this.obtenerDetalleRapido(id);
        if (recetaFull) {
          window.dispatchEvent(new CustomEvent('app:agregar-comparador', { detail: { receta: recetaFull } }));
        }
      });
    });

    this.renderizarPaginador(total);
  }

  async obtenerDetalleRapido(id) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
      const data = await res.json();
      return data.meals ? data.meals[0] : null;
    } catch (e) {
      return null;
    }
  }

  renderizarPaginador(total) {
    const container = document.getElementById('paginador-container');
    const totalPaginas = Math.ceil(total / this.estado.porPagina);
    if (totalPaginas <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="paginador">
        <button ${this.estado.paginaActual === 1 ? 'disabled' : ''} id="btn-prev">Anterior</button>
        <span>Página ${this.estado.paginaActual} de ${totalPaginas}</span>
        <button ${this.estado.paginaActual === totalPaginas ? 'disabled' : ''} id="btn-next">Siguiente</button>
      </div>
    `;

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (this.estado.paginaActual > 1) {
        this.estado.paginaActual--;
        this.renderizarResultados();
      }
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (this.estado.paginaActual < totalPaginas) {
        this.estado.paginaActual++;
        this.renderizarResultados();
      }
    });
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}