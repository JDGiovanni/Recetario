class VistaDetalle {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.idReceta = props.id || null;
    this.render();
  }

  async render() {
    this.contenedor.innerHTML = `
      <section class="vista-detalle">
        <button id="btn-volver" class="btn-secundario">← Volver</button>
        <div id="detalle-carga" class="skeleton-detalle">Cargando detalles de la receta...</div>
        <div id="detalle-contenido" class="hidden"></div>
        <div id="detalle-error" class="hidden"></div>
      </section>
    `;

    this.configurarEventosBase();
    if (this.idReceta) {
      await this.cargarReceta();
    } else {
      this.mostrarError('No se especificó una receta válida.');
    }
  }

  configurarEventosBase() {
    const btnVolver = document.getElementById('btn-volver');
    btnVolver.addEventListener('click', () => {
      window.history.back();
    });
  }

  async cargarReceta() {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${this.idReceta}`);
      const data = await res.json();
      const receta = data.meals ? data.meals[0] : null;

      document.getElementById('detalle-carga').remove();

      if (!receta) {
        this.mostrarError('No se encontró la receta solicitada.');
        return;
      }

      const contenido = document.getElementById('detalle-contenido');
      contenido.classList.remove('hidden');

      const tags = receta.strTags ? receta.strTags.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      let ingredientesHTML = '';
      for (let i = 1; i <= 20; i++) {
        const ing = receta[`strIngredient${i}`];
        const medida = receta[`strMeasure${i}`];
        if (ing && ing.trim() !== '') {
          const imgUrl = `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ing)}.png`;
          ingredientesHTML += `
            <div class="ingrediente-item">
              <img src="${imgUrl}" alt="${ing}" onerror="this.src='assets/placeholder.png'">
              <span>${medida ? medida + ' of' : ''} <strong>${ing}</strong></span>
            </div>
          `;
        }
      }

      const lineasPasos = receta.strInstructions.split('\n');
      const pasos = lineasPasos
        .map(l => l.trim())
        .filter(l => l.length > 0 && !/^step\s*\d+/i.test(l) && !/^\d+\.$/.test(l));

      const pasosHTML = pasos.map(p => `<li>${p}</li>`).join('');

      let youtubeHTML = '';
      if (receta.strYoutube) {
        const embedUrl = receta.strYoutube.replace('watch?v=', 'embed/');
        youtubeHTML = `<a href="${receta.strYoutube}" target="_blank" class="btn-primario">Ver video en YouTube</a>`;
      }

      contenido.innerHTML = `
        <div class="detalle-header">
          <img src="${receta.strMealThumb}" alt="${receta.strMeal}">
          <div class="detalle-info-principal">
            <h2>${receta.strMeal}</h2>
            <p><strong>Categoría:</strong> ${receta.strCategory}</p>
            <p><strong>Origen:</strong> ${receta.strArea}</p>
            <div class="tags-container">
              ${tags.map(t => `<span class="badge">${t}</span>`).join('')}
            </div>
            <button id="btn-comparar-detalle" class="btn-primario">Agregar al Comparador</button>
          </div>
        </div>

        <div class="detalle-secciones">
          <div class="columna-ingredientes">
            <h3>Ingredientes</h3>
            <div class="grid-ingredientes">${ingredientesHTML}</div>
          </div>
          <div class="columna-pasos">
            <h3>Preparación</h3>
            <ol class="lista-pasos">${pasosHTML}</ol>
            ${youtubeHTML}
          </div>
        </div>

        <div class="relacionadas-section">
          <h3>Recetas Relacionadas</h3>
          <div id="relacionadas-grid" class="grid-tarjetas"></div>
        </div>
      `;

      document.getElementById('btn-comparar-detalle').addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app:agregar-comparador', { detail: { receta } }));
      });

      this.cargarRelacionadas(receta.strCategory, receta.strArea);

    } catch (e) {
      document.getElementById('detalle-carga').remove();
      this.mostrarError('Error de conexión al cargar la receta.');
    }
  }

  async cargarRelacionadas(categoria, origen) {
    const grid = document.getElementById('relacionadas-grid');
    try {
      const [resCat, resArea] = await Promise.allSettled([
        fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(categoria)}`).then(r => r.json()),
        fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(origen)}`).then(r => r.json())
      ]);

      let lista = [];
      if (resCat.status === 'fulfilled' && resCat.value.meals) {
        lista.push(...resCat.value.meals);
      }
      if (resArea.status === 'fulfilled' && resArea.value.meals) {
        lista.push(...resArea.value.meals);
      }

      const unicas = Array.from(new Set(lista.map(r => r.idMeal)))
        .map(id => lista.find(r => r.idMeal === id))
        .filter(r => r.idMeal !== this.idReceta)
        .slice(0, 6);

      if (unicas.length === 0) {
        grid.innerHTML = '<p>No hay recetas relacionadas.</p>';
        return;
      }

      grid.innerHTML = unicas.map(r => `
        <div class="tarjeta-receta">
          <img src="${r.strMealThumb}" alt="${r.strMeal}">
          <div class="tarjeta-body">
            <h4>${r.strMeal}</h4>
            <a href="#detalle/${r.idMeal}" class="btn-secundario" data-link>Ver Detalle</a>
          </div>
        </div>
      `).join('');

    } catch (e) {
      grid.innerHTML = '<p>Error al cargar recetas relacionadas.</p>';
    }
  }

  mostrarError(msg) {
    const errorEl = document.getElementById('detalle-error');
    errorEl.classList.remove('hidden');
    errorEl.innerHTML = `<p class="error-texto">${msg}</p>`;
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}
