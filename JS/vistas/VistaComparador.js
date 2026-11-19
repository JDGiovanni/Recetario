class VistaComparador {
  constructor(contenedor, props = {}) {
    this.contenedor = contenedor;
    this.props = props;
    this.estado = {
      controllerA: null,
      controllerB: null
    };
    this.render();
  }

  obtenerComparador() {
    if (typeof app !== 'undefined' && app.estadoGlobal) {
      return app.estadoGlobal.comparador;
    }
    if (!window._comparadorFallback) {
      window._comparadorFallback = [];
    }
    return window._comparadorFallback;
  }

  notificarCambio() {
    const comparador = this.obtenerComparador();
    window.dispatchEvent(new CustomEvent('app:comparador-actualizado', {
      detail: { cantidad: comparador.length }
    }));
  }

  render() {
    const comparador = this.obtenerComparador();

    this.contenedor.innerHTML = `
      <section class="vista-comparador">
        <h2>Comparador de Recetas</h2>
        <div class="paneles-comparador-grid">
          <div class="panel-comparador" id="panel-a">
            <h3>Panel A</h3>
            <div id="contenido-panel-a"></div>
          </div>
          <div class="panel-comparador" id="panel-b">
            <h3>Panel B</h3>
            <div id="contenido-panel-b"></div>
          </div>
        </div>
        <div class="acciones-comparador-central">
          <button id="btn-intercambiar" class="btn-secundario" ${comparador.length < 2 ? 'disabled' : ''}>Intercambiar Recetas</button>
        </div>
        <div id="tabla-comparacion-container"></div>
      </section>
    `;

    this.renderizarPanel('A', comparador[0]);
    this.renderizarPanel('B', comparador[1]);
    this.configurarEventosGlobales();

    if (comparador.length === 2) {
      this.renderizarTablaComparacion(comparador[0], comparador[1]);
    }
  }

  renderizarPanel(panelId, receta) {
    const contenedorId = panelId === 'A' ? 'contenido-panel-a' : 'contenido-panel-b';
    const container = document.getElementById(contenedorId);
    if (!container) return;

    if (receta) {
      const catLegible = (receta.strCategory && receta.strCategory !== 'null') ? receta.strCategory : 'General';
      const areaLegible = (receta.strArea && receta.strArea !== 'null') ? receta.strArea : 'Internacional';

      container.innerHTML = `
        <div class="panel-receta-seleccionada">
          <img src="${receta.strMealThumb}" alt="${receta.strMeal}">
          <h4>${receta.strMeal}</h4>
          <p><strong>Categoría:</strong> ${catLegible}</p>
          <p><strong>Origen:</strong> ${areaLegible}</p>
          <button class="btn-secundario btn-vaciar-panel" data-panel="${panelId}">Quitar Receta</button>
        </div>
      `;

      container.querySelector('.btn-vaciar-panel').addEventListener('click', () => {
        this.quitarReceta(panelId);
      });
    } else {
      container.innerHTML = `
        <div class="panel-buscador-interno">
          <input type="text" class="input-busqueda-panel" data-panel="${panelId}" placeholder="Buscar receta por nombre...">
          <div class="sugerencias-panel" id="sugerencias-${panelId.toLowerCase()}"></div>
        </div>
      `;

      const input = container.querySelector('.input-busqueda-panel');
      input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        this.manejarDebounceBusqueda(panelId, query);
      });
    }
  }

  manejarDebounceBusqueda(panelId, query) {
    const propController = panelId === 'A' ? 'controllerA' : 'controllerB';
    if (this.estado[propController]) {
      this.estado[propController].abort();
    }

    if (query.length < 2) {
      const sugerenciasEl = document.getElementById(`sugerencias-${panelId.toLowerCase()}`);
      if (sugerenciasEl) sugerenciasEl.innerHTML = '';
      return;
    }

    this.estado[propController] = new AbortController();
    const signal = this.estado[propController].signal;

    setTimeout(async () => {
      try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`, { signal });
        const data = await res.json();
        const recetas = data.meals || [];
        this.mostrarSugerenciasPanel(panelId, recetas);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error buscando receta:', error);
        }
      }
    }, 400);
  }

  mostrarSugerenciasPanel(panelId, recetas) {
    const sugerenciasEl = document.getElementById(`sugerencias-${panelId.toLowerCase()}`);
    if (!sugerenciasEl) return;

    if (recetas.length === 0) {
      sugerenciasEl.innerHTML = '<p class="sugerencia-vacia">No se encontraron recetas.</p>';
      return;
    }

    sugerenciasEl.innerHTML = recetas.slice(0, 5).map(r => `
      <div class="sugerencia-item" data-id="${r.idMeal}" style="display:flex; align-items:center; gap:0.75rem; padding:0.5rem; border-bottom:1px solid #eee; cursor:pointer;">
        <img src="${r.strMealThumb}" alt="${r.strMeal}">
        <span>${r.strMeal}</span>
      </div>
    `).join('');

    sugerenciasEl.querySelectorAll('.sugerencia-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.getAttribute('data-id');
        const recetaCompleta = await this.obtenerRecetaPorId(id);
        if (recetaCompleta) {
          this.agregarRecetaAComparador(recetaCompleta);
        }
      });
    });
  }

  async obtenerRecetaPorId(id) {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`);
      const data = await res.json();
      const raw = data.meals ? data.meals[0] : null;
      return (raw && typeof normalizarReceta === 'function') ? normalizarReceta(raw) : raw;
    } catch (e) {
      return null;
    }
  }

  agregarRecetaAComparador(receta) {
    const comparador = this.obtenerComparador();

    if (comparador.some(r => r.idMeal === receta.idMeal)) {
      alert('No se puede comparar una receta consigo misma.');
      return;
    }

    if (comparador.length < 2) {
      comparador.push(receta);
    } else {
      comparador[0] = comparador[1];
      comparador[1] = receta;
    }

    this.notificarCambio();
    this.render();
  }

  quitarReceta(panelId) {
    const comparador = this.obtenerComparador();
    if (panelId === 'A') {
      comparador.shift();
    } else {
      comparador.pop();
    }
    this.notificarCambio();
    this.render();
  }

  configurarEventosGlobales() {
    const btnIntercambiar = document.getElementById('btn-intercambiar');
    if (btnIntercambiar) {
      btnIntercambiar.addEventListener('click', () => {
        const comparador = this.obtenerComparador();
        if (comparador.length === 2) {
          const temp = comparador[0];
          comparador[0] = comparador[1];
          comparador[1] = temp;
          this.render();
        }
      });
    }
  }

  extraerIngredientes(receta) {
    const ingredientes = [];
    for (let i = 1; i <= 20; i++) {
      const ing = receta[`strIngredient${i}`];
      if (ing && ing.trim() !== '') {
        ingredientes.push(ing.trim().toLowerCase());
      }
    }
    return ingredientes;
  }

  extraerPasos(receta) {
    if (!receta.strInstructions) return 0;
    const lineas = receta.strInstructions.split('\n');
    const pasos = lineas
      .map(l => l.trim())
      .filter(l => l.length > 0 && !/^step\s*\d+/i.test(l) && !/^\d+\.$/.test(l));
    return pasos.length;
  }

  extraerEtiquetas(receta) {
    if (!receta.strTags) return [];
    return receta.strTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  renderizarTablaComparacion(recetaA, recetaB) {
    const container = document.getElementById('tabla-comparacion-container');
    if (!container) return;

    const ingsA = this.extraerIngredientes(recetaA);
    const ingsB = this.extraerIngredientes(recetaB);

    const pasosA = this.extraerPasos(recetaA);
    const pasosB = this.extraerPasos(recetaB);

    const palabrasA = recetaA.strInstructions ? recetaA.strInstructions.trim().split(/\s+/).length : 0;
    const palabrasB = recetaB.strInstructions ? recetaB.strInstructions.trim().split(/\s+/).length : 0;

    const tagsA = this.extraerEtiquetas(recetaA);
    const tagsB = this.extraerEtiquetas(recetaB);
    const tagsComun = tagsA.filter(t => tagsB.includes(t));

    const ingsSetA = new Set(ingsA);
    const ingsSetB = new Set(ingsB);
    const ingsComun = ingsA.filter(i => ingsSetB.has(i));
    const ingsExclusivosA = ingsA.filter(i => !ingsSetB.has(i));
    const ingsExclusivosB = ingsB.filter(i => !ingsSetA.has(i));

    const totalDistintos = new Set([...ingsA, ...ingsB]).size;
    const similitud = totalDistintos > 0 ? Math.round((ingsComun.length / totalDistintos) * 100) : 0;

    const videoA = Boolean(recetaA.strYoutube && recetaA.strYoutube.trim() !== '');
    const videoB = Boolean(recetaB.strYoutube && recetaB.strYoutube.trim() !== '');

    const catA = (recetaA.strCategory && recetaA.strCategory !== 'null') ? recetaA.strCategory : 'General';
    const catB = (recetaB.strCategory && recetaB.strCategory !== 'null') ? recetaB.strCategory : 'General';
    const areaA = (recetaA.strArea && recetaA.strArea !== 'null') ? recetaA.strArea : 'Internacional';
    const areaB = (recetaB.strArea && recetaB.strArea !== 'null') ? recetaB.strArea : 'Internacional';

    let recetaSimple = 'Empate';
    if (ingsA.length !== ingsB.length) {
      recetaSimple = ingsA.length < ingsB.length ? recetaA.strMeal : recetaB.strMeal;
    } else if (pasosA !== pasosB) {
      recetaSimple = pasosA < pasosB ? recetaA.strMeal : recetaB.strMeal;
    } else if (palabrasA !== palabrasB) {
      recetaSimple = palabrasA < palabrasB ? recetaA.strMeal : recetaB.strMeal;
    }

    container.innerHTML = `
      <div class="resultado-comparacion-wrapper">
        <h3>Informe de Comparación</h3>
        <table class="tabla-metricas">
          <thead>
            <tr>
              <th>Métrica</th>
              <th>${recetaA.strMeal}</th>
              <th>${recetaB.strMeal}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cantidad de ingredientes</td>
              <td class="${ingsA.length < ingsB.length ? 'menor-valor' : ''}">${ingsA.length}</td>
              <td class="${ingsB.length < ingsA.length ? 'menor-valor' : ''}">${ingsB.length}</td>
            </tr>
            <tr>
              <td>Cantidad de pasos</td>
              <td class="${pasosA < pasosB ? 'menor-valor' : ''}">${pasosA}</td>
              <td class="${pasosB < pasosA ? 'menor-valor' : ''}">${pasosB}</td>
            </tr>
            <tr>
              <td>Extensión de instrucciones (palabras)</td>
              <td class="${palabrasA < palabrasB ? 'menor-valor' : ''}">${palabrasA} palabras</td>
              <td class="${palabrasB < palabrasA ? 'menor-valor' : ''}">${palabrasB} palabras</td>
            </tr>
            <tr>
              <td>Categoría y Origen</td>
              <td>${catA} (${areaA})</td>
              <td>${catB} (${areaB}) — ${catA === catB && areaA === areaB ? 'Coinciden' : 'Diferentes'}</td>
            </tr>
            <tr>
              <td>Etiquetas en común</td>
              <td colspan="2">${tagsComun.length > 0 ? tagsComun.join(', ') : 'Ninguna'}</td>
            </tr>
            <tr>
              <td>Video disponible</td>
              <td>${videoA ? 'Sí' : 'No'}</td>
              <td>${videoB ? 'Sí' : 'No'}</td>
            </tr>
            <tr>
              <td>Ingredientes en común</td>
              <td colspan="2">${ingsComun.length > 0 ? ingsComun.join(', ') : 'Ninguno'}</td>
            </tr>
            <tr>
              <td>Ingredientes exclusivos</td>
              <td><strong>Solo A:</strong> ${ingsExclusivosA.join(', ') || 'Ninguno'}</td>
              <td><strong>Solo B:</strong> ${ingsExclusivosB.join(', ') || 'Ninguno'}</td>
            </tr>
            <tr>
              <td>Similitud</td>
              <td colspan="2"><strong>${similitud}%</strong></td>
            </tr>
            <tr>
              <td>Receta más sencilla</td>
              <td colspan="2">🏆 <strong>${recetaSimple}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}
