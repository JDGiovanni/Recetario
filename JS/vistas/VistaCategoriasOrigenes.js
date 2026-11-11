class VistaCategoriasOrigenes {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      pestanaActiva: 'categorias',
      categorias: [],
      origenes: [],
      seleccionActual: null,
      recetasFiltro: []
    };
    this.render();
  }

  async render() {
    this.contenedor.innerHTML = `
      <section class="vista-cat-origen">
        <div class="pestanas-nav">
          <button id="tab-categorias" class="btn-pestana activa">Categorías</button>
          <button id="tab-origenes" class="btn-pestana">Orígenes</button>
        </div>
        <div id="contenido-pestana" class="contenido-pestana-container">
          <div class="skeleton-loader">Cargando información...</div>
        </div>
      </section>
    `;

    this.configurarPestanas();
    await this.cargarDatosIniciales();
  }

  configurarPestanas() {
    const btnCat = document.getElementById('tab-categorias');
    const btnOri = document.getElementById('tab-origenes');

    btnCat.addEventListener('click', () => {
      this.estado.pestanaActiva = 'categorias';
      this.estado.seleccionActual = null;
      btnCat.classList.add('activa');
      btnOri.classList.remove('activa');
      this.renderizarContenidoPestana();
    });

    btnOri.addEventListener('click', () => {
      this.estado.pestanaActiva = 'origenes';
      this.estado.seleccionActual = null;
      btnOri.classList.add('activa');
      btnCat.classList.remove('activa');
      this.renderizarContenidoPestana();
    });
  }

  async cargarDatosIniciales() {
    try {
      const [resCat, resOri] = await Promise.all([
        fetch('https://www.themealdb.com/api/json/v1/1/categories.php').then(r => r.json()),
        fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list').then(r => r.json())
      ]);

      this.estado.categorias = resCat.categories || [];
      this.estado.origenes = resOri.meals || [];
      this.renderizarContenidoPestana();
    } catch (e) {
      document.getElementById('contenido-pestana').innerHTML = '<p class="error-texto">Error al cargar datos.</p>';
    }
  }

  async renderizarContenidoPestana() {
    const contenedor = document.getElementById('contenido-pestana');

    if (this.estado.seleccionActual) {
      contenedor.innerHTML = `
        <button id="btn-volver-lista" class="btn-secundario">← Volver al listado</button>
        <h3>Recetas de: ${this.estado.seleccionActual}</h3>
        <div class="grid-tarjetas" id="grid-recetas-filtro">
          <div class="skeleton-loader">Cargando recetas...</div>
        </div>
      `;

      document.getElementById('btn-volver-lista').addEventListener('click', () => {
        this.estado.seleccionActual = null;
        this.renderizarContenidoPestana();
      });

      const endpoint = this.estado.pestanaActiva === 'categorias' 
        ? `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(this.estado.seleccionActual)}`
        : `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(this.estado.seleccionActual)}`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        const recetas = data.meals || [];
        const grid = document.getElementById('grid-recetas-filtro');

        if (recetas.length === 0) {
          grid.innerHTML = '<p>No hay recetas disponibles.</p>';
          return;
        }

        grid.innerHTML = recetas.map(r => `
          <div class="tarjeta-receta">
            <img src="${r.strMealThumb}" alt="${r.strMeal}">
            <div class="tarjeta-body">
              <h4>${r.strMeal}</h4>
              <a href="#detalle/${r.idMeal}" class="btn-secundario" data-link>Ver Detalle</a>
            </div>
          </div>
        `).join('');

      } catch (e) {
        document.getElementById('grid-recetas-filtro').innerHTML = '<p class="error-texto">Error al cargar recetas.</p>';
      }
      return;
    }

    if (this.estado.pestanaActiva === 'categorias') {
      contenedor.innerHTML = `
        <div class="grid-categorias">
          ${this.estado.categorias.map(c => `
            <div class="card-categoria" data-nombre="${c.strCategory}">
              <img src="${c.strCategoryThumb}" alt="${c.strCategory}">
              <div class="card-categoria-body">
                <h4>${c.strCategory}</h4>
                <p>${c.strCategoryDescription ? c.strCategoryDescription.substring(0, 100) + '...' : ''}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      contenedor.querySelectorAll('.card-categoria').forEach(card => {
        card.addEventListener('click', () => {
          this.estado.seleccionActual = card.getAttribute('data-nombre');
          this.renderizarContenidoPestana();
        });
      });

    } else {
      contenedor.innerHTML = `
        <div class="grid-origenes">
          ${this.estado.origenes.map(o => `
            <div class="card-origen" data-nombre="${o.strArea}">
              <h4>🌍 ${o.strArea}</h4>
            </div>
          `).join('')}
        </div>
      `;

      contenedor.querySelectorAll('.card-origen').forEach(card => {
        card.addEventListener('click', () => {
          this.estado.seleccionActual = card.getAttribute('data-nombre');
          this.renderizarContenidoPestana();
        });
      });
    }
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}