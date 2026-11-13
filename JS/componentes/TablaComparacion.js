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

  obtenerPasos(receta) {
    const texto = String(receta.strInstructions || '').replace(/\r\n?/g, '\n').trim();
    if (!texto) return [];

    let pasos = texto.split(/\n+/).map(paso => paso.trim()).filter(Boolean);
    if (pasos.length === 1 && /(?:^|\s)(?:step\s*\d+|\d+[.)])\s+/i.test(pasos[0])) {
      pasos = pasos[0]
        .split(/\s+(?=(?:step\s*\d+|\d+[.)])\s+)/i)
        .map(paso => paso.trim())
        .filter(Boolean);
    }

    return pasos.map(paso =>
      paso.replace(/^(?:step\s*\d+\s*[:.)-]?|\d+[.)])\s*/i, '').trim()
    ).filter(Boolean);
  }

  obtenerCantidadPalabras(receta) {
    const instrucciones = String(receta.strInstructions || '').trim();
    return instrucciones ? instrucciones.split(/\s+/).length : 0;
  }

  obtenerTags(receta) {
    return String(receta.strTags || '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  crearFilasResumen() {
    const recetas = this.recetas;
    const ingredientes = recetas.map(receta => this.obtenerIngredientes(receta));
    const conjuntos = ingredientes.map(lista =>
      new Set(lista.map(ingrediente => ingrediente.normalizado))
    );
    const compartidos = ingredientes[0]
      .filter(ingrediente => conjuntos[1].has(ingrediente.normalizado))
      .map(ingrediente => ingrediente.nombre);
    const exclusivos = ingredientes.map((lista, indice) =>
      lista.filter(ingrediente => !conjuntos[1 - indice].has(ingrediente.normalizado))
        .map(ingrediente => ingrediente.nombre)
    );
    const tags = recetas.map(receta => this.obtenerTags(receta));
    const tagsComunes = tags[0]
      .filter(tag => tags[1].some(otro => this.normalizar(otro) === this.normalizar(tag)));
    const unionIngredientes = new Set([...conjuntos[0], ...conjuntos[1]]);
    const similitud = unionIngredientes.size
      ? Math.round((compartidos.length / unionIngredientes.size) * 100)
      : 0;
    const cantidadPasos = recetas.map(receta => this.obtenerPasos(receta).length);
    const cantidadPalabras = recetas.map(receta => this.obtenerCantidadPalabras(receta));

    let recetaSencilla = 'Empate';
    const [primera, segunda] = recetas;
    if (ingredientes[0].length !== ingredientes[1].length) {
      recetaSencilla = ingredientes[0].length < ingredientes[1].length
        ? primera.strMeal
        : segunda.strMeal;
    } else if (cantidadPasos[0] !== cantidadPasos[1]) {
      recetaSencilla = cantidadPasos[0] < cantidadPasos[1] ? primera.strMeal : segunda.strMeal;
    } else if (cantidadPalabras[0] !== cantidadPalabras[1]) {
      recetaSencilla = cantidadPalabras[0] < cantidadPalabras[1] ? primera.strMeal : segunda.strMeal;
    }

    return [
      this.crearFila('Ingredientes en común', [compartidos.join(', ') || 'Ninguno', compartidos.join(', ') || 'Ninguno']),
      this.crearFila('Ingredientes exclusivos', [
        exclusivos[0].join(', ') || 'Ninguno',
        exclusivos[1].join(', ') || 'Ninguno'
      ]),
      this.crearFila('Etiquetas en común', [tagsComunes.join(', ') || 'Ninguna', tagsComunes.join(', ') || 'Ninguna']),
      this.crearFila('Video disponible', recetas.map(receta => receta.strYoutube ? 'Sí' : 'No')),
      this.crearFila('Similitud de ingredientes', [`${similitud}%`, `${similitud}%`]),
      this.crearFila('Receta más sencilla', [recetaSencilla, recetaSencilla])
    ].join('');
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
        recetas.map(receta => String(this.obtenerPasos(receta).length))
      ),
      this.crearFila(
        'Extensión de instrucciones',
        recetas.map(receta => `${this.obtenerCantidadPalabras(receta)} palabras`)
      ),
      this.crearFilasResumen(),
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
