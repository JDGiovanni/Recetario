class TablaComparacion {
  constructor(contenedor, recetas = [], opciones = {}) {
    if (!contenedor) {
      throw new TypeError('TablaComparacion requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.maxRecetas = Math.max(2, Math.floor(Number(opciones.maxRecetas) || 2));
    this.recetas = [];
    this.actualizar(recetas);
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

  actualizar(recetas = []) {
    if (!Array.isArray(recetas)) {
      throw new TypeError('TablaComparacion espera una lista de recetas.');
    }

    this.recetas = recetas.filter(receta => receta && typeof receta === 'object')
      .slice(0, this.maxRecetas);
    return this.render();
  }

  normalizar(valor) {
    return String(valor ?? '').trim().toLocaleLowerCase();
  }

  obtenerIngredientes(receta) {
    const ingredientes = [];

    for (let indice = 1; indice <= 20; indice++) {
      const nombre = String(receta[`strIngredient${indice}`] || '').trim();
      if (nombre) {
        ingredientes.push({
          nombre,
          normalizado: this.normalizar(nombre),
          medida: String(receta[`strMeasure${indice}`] || '').trim()
        });
      }
    }

    return ingredientes;
  }

  obtenerTags(receta) {
    return String(receta.strTags || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  escaparAtributo(valor) {
    return this.escaparHTML(valor);
  }

  renderEstado() {
    const seleccionadas = this.recetas.length;
    const faltantes = this.maxRecetas - seleccionadas;
    const mensaje = seleccionadas === 0
      ? `Agrega ${this.maxRecetas} recetas para comenzar la comparación.`
      : `Falta${faltantes === 1 ? '' : 'n'} ${faltantes} receta${faltantes === 1 ? '' : 's'} para comparar.`;

    return `
      <div class="comparacion-estado" role="status" aria-live="polite"
        data-listo="${faltantes === 0}">
        <p>${mensaje}</p>
        <p>${seleccionadas} de ${this.maxRecetas} recetas seleccionadas.</p>
      </div>
    `;
  }

  crearFila(etiqueta, valores, claves = valores) {
    const normalizados = claves.map(valor => this.normalizar(valor));
    const hayDiferencias = normalizados.some(valor => valor !== normalizados[0]);
    const clase = hayDiferencias ? ' class="comparacion-diferente"' : '';

    return `
      <tr${clase}>
        <th scope="row">${this.escaparHTML(etiqueta)}</th>
        ${valores.map(valor => `
          <td>${this.escaparHTML(valor || 'No especificado')}</td>
        `).join('')}
      </tr>
    `;
  }

  crearFilasIngredientes() {
    const ingredientesPorReceta = this.recetas.map(receta => this.obtenerIngredientes(receta));
    const nombres = new Map();

    ingredientesPorReceta.flat().forEach(ingrediente => {
      if (!nombres.has(ingrediente.normalizado)) {
        nombres.set(ingrediente.normalizado, ingrediente.nombre);
      }
    });

    return Array.from(nombres.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([normalizado, nombre]) => {
        const valores = ingredientesPorReceta.map(ingredientes => {
          const ingrediente = ingredientes.find(item => item.normalizado === normalizado);
          if (!ingrediente) {
            return 'No incluido';
          }
          return ingrediente.medida
            ? `${ingrediente.medida} (${ingrediente.nombre})`
            : ingrediente.nombre;
        });

        return this.crearFila(`Ingrediente: ${nombre}`, valores);
      }).join('');
  }

  renderTabla() {
    const recetas = this.recetas;
    const encabezados = recetas.map((receta, indice) => `
      <th scope="col">
        ${receta.strMealThumb
          ? `<img class="tabla-comparacion-imagen" src="${this.escaparAtributo(receta.strMealThumb)}" alt="" loading="lazy">`
          : ''}
        <span>${this.escaparHTML(receta.strMeal || `Receta ${indice + 1}`)}</span>
      </th>
    `).join('');

    const filas = [
      this.crearFila('Categoría', recetas.map(receta => receta.strCategory)),
      this.crearFila('Origen', recetas.map(receta => receta.strArea)),
      this.crearFila(
        'Etiquetas',
        recetas.map(receta => this.obtenerTags(receta).join(', '))
      ),
      this.crearFila(
        'Cantidad de ingredientes',
        recetas.map(receta => String(this.obtenerIngredientes(receta).length))
      ),
      this.crearFila(
        'Cantidad de pasos',
        recetas.map(receta => {
          const instrucciones = String(receta.strInstructions || '').trim();
          if (!instrucciones) {
            return 'No especificado';
          }
          return String(instrucciones.split(/\n+/).filter(paso => paso.trim()).length);
        })
      ),
      this.crearFilasIngredientes()
    ].join('');

    return `
      <div class="tabla-comparacion-wrapper" role="region" aria-label="Comparación de recetas" tabindex="0">
        <table class="tabla-comparacion">
          <caption>Comparación de recetas. Las filas resaltadas muestran diferencias.</caption>
          <thead>
            <tr>
              <th scope="col">Característica</th>
              ${encabezados}
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    `;
  }

  render() {
    const estado = this.renderEstado();
    const comparacionLista = this.recetas.length === this.maxRecetas
      ? this.renderTabla()
      : '';

    this.contenedor.innerHTML = `
      <section class="comparador-tabla">
        ${estado}
        ${comparacionLista}
      </section>
    `;
    return this.contenedor;
  }

  destruir() {
    this.contenedor.innerHTML = '';
  }
}
