class VistaInicio {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      recetaDestacada: null,
      categorias: [],
      cargando: true
    };
    this.idUltimaReceta = null;
    this.render();
  }

  async render() {
    this.contenedor.innerHTML = `
      <section class="vista-inicio">
        <div id="inicio-carga" class="estado-carga-container">
          <div class="skeleton-banner"></div>
          <div class="skeleton-grid"></div>
        </div>
        <div id="inicio-contenido" class="inicio-contenido hidden">
          <!-- Sección Receta Destacada -->
          <div class="destacada-section">
            <h2>Receta Destacada del Día</h2>
            <div id="receta-destacada-card" class="tarjeta-destacada"></div>
            <button id="btn-otra-receta" class="btn-secundario">Otra receta</button>
          </div>
          
          <!-- Sección Cuadrícula de Categorías -->
          <div class="categorias-section">
            <h2>Explora por Categorías</h2>
            <div id="cuadricula-categorias" class="grid-categorias"></div>
          </div>
        </div>
        <div id="inicio-error" class="error-container hidden"></div>
      </section>
    `;

    this.configurarEventos();
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const [resReceta, resCategorias] = await Promise.allSettled([
        fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json()),
        fetch('https://www.themealdb.com/api/json/v1/1/categories.php').then(r => r.json())
      ]);

      const contenidoEl = document.getElementById('inicio-contenido');
      const cargaEl = document.getElementById('inicio-carga');
      if (cargaEl) cargaEl.remove();
      if (contenidoEl) contenidoEl.classList.remove('hidden');

      if (resReceta.status === 'fulfilled') {
        const recetaData = resReceta.value.meals ? resReceta.value.meals[0] : null;
        if (recetaData) {
          this.estado.recetaDestacada = recetaData;
          this.idUltimaReceta = recetaData.idMeal;
          this.renderizarDestacada(recetaData);
        } else {
          this.mostrarErrorParcial('receta-destacada-card', 'No se pudo cargar la receta destacada.');
        }
      } else {
        this.mostrarErrorParcial('receta-destacada-card', 'Error de conexión al cargar la receta.');
      }

      if (resCategorias.status === 'fulfilled') {
        const categoriasData = resCategorias.value.categories || [];
        this.estado.categorias = categoriasData;
        this.renderizarCategorias(categoriasData);
      } else {
        this.mostrarErrorParcial('cuadricula-categorias', 'Error al cargar las categorías.');
      }

    } catch (error) {
      console.error('Error general en VistaInicio:', error);
      this.mostrarErrorGlobal();
    }
  }

  renderizarDestacada(receta) {
    const container = document.getElementById('receta-destacada-card');
    if (!container) return;

    container.innerHTML = `
      <div class="tarjeta-imagen-wrapper">
        <img src="${receta.strMealThumb}" alt="${receta.strMeal}" loading="lazy">
      </div>
      <div class="tarjeta-info">
        <span class="badge">${receta.strCategory || 'General'}</span>
        <span class="badge origen">${receta.strArea || 'Internacional'}</span>
        <h3>${receta.strMeal}</h3>
        <p>${receta.strInstructions ? receta.strInstructions.substring(0, 150) + '...' : ''}</p>
        <div class="tarjeta-acciones">
          <a href="#detalle/${receta.idMeal}" class="btn-primario" data-link>Ver Detalle</a>
          <button class="btn-accion btn-comparar" data-id="${receta.idMeal}">Agregar al Comparador</button>
        </div>
      </div>
    `;

    const btnComparar = container.querySelector('.btn-comparar');
    btnComparar.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app:agregar-comparador', { detail: { receta } }));
    });
  }

  renderizarCategorias(categorias) {
    const container = document.getElementById('cuadricula-categorias');
    if (!container) return;

    container.innerHTML = categorias.map(cat => {
      const descCorta = cat.strCategoryDescription ? cat.strCategoryDescription.substring(0, 120) + '...' : '';
      return `
        <div class="card-categoria" data-categoria="${cat.strCategory}">
          <img src="${cat.strCategoryThumb}" alt="${cat.strCategory}" loading="lazy">
          <div class="card-categoria-body">
            <h4>${cat.strCategory}</h4>
            <p>${descCorta}</p>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.card-categoria').forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-categoria');
        window.location.hash = `#categorias/cat/${cat}`;
      });
    });
  }

  mostrarErrorParcial(elementoId, mensaje) {
    const el = document.getElementById(elementoId);
    if (el) {
      el.innerHTML = `<div class="mensaje-error-parcial"><p>${mensaje}</p><button class="btn-reintentar">Reintentar</button></div>`;
      el.querySelector('.btn-reintentar').addEventListener('click', () => this.cargarDatos());
    }
  }

  mostrarErrorGlobal() {
    const cargaEl = document.getElementById('inicio-carga');
    if (cargaEl) cargaEl.remove();
    const errorEl = document.getElementById('inicio-error');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      errorEl.innerHTML = `
        <div class="error-banner">
          <h3>Error de Conexión</h3>
          <p>No se pudieron cargar los contenidos de inicio. Comprueba tu conexión a internet.</p>
          <button id="btn-reintentar-global" class="btn-primario">Reintentar</button>
        </div>
      `;
      document.getElementById('btn-reintentar-global').addEventListener('click', () => this.render());
    }
  }

  configurarEventos() {
    const btnOtra = document.getElementById('btn-otra-receta');
    if (btnOtra) {
      btnOtra.addEventListener('click', () => {
        this.cargarRecetaDestacadaUnica();
      });
    }
  }

  async cargarRecetaDestacadaUnica() {
    const container = document.getElementById('receta-destacada-card');
    if (container) container.innerHTML = `<div class="skeleton-tarjeta">Cargando otra receta...</div>`;
    
    try {
      const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
      const data = await response.json();
      const receta = data.meals ? data.meals[0] : null;

      if (receta) {
        if (receta.idMeal === this.idUltimaReceta) {
          return this.cargarRecetaDestacadaUnica();
        }
        this.idUltimaReceta = receta.idMeal;
        this.estado.recetaDestacada = receta;
        this.renderizarDestacada(receta);
      }
    } catch (e) {
      this.mostrarErrorParcial('receta-destacada-card', 'No se pudo obtener otra receta.');
    }
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}