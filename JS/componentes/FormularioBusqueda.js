class FormularioBusqueda {
  constructor(contenedor, opciones = {}) {
    if (!contenedor) {
      throw new TypeError('FormularioBusqueda requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.categorias = opciones.categorias || [];
    this.origenes = opciones.origenes || [];
    this.valoresIniciales = opciones.valoresIniciales || {};
    this.onBuscar = opciones.onBuscar;
    this.onLimpiar = opciones.onLimpiar;
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

  renderizarOpciones(elementos, obtenerValor, seleccionado, etiquetaVacia) {
    const opcionVacia = `<option value="">${etiquetaVacia}</option>`;
    return opcionVacia + elementos.map(elemento => {
      const valor = obtenerValor(elemento);
      const valorSeguro = this.escaparHTML(valor);
      const activa = valor === seleccionado ? ' selected' : '';
      return `<option value="${valorSeguro}"${activa}>${valorSeguro}</option>`;
    }).join('');
  }

  render() {
    const valores = this.valoresIniciales;
    return `
      <form class="form-explorar" novalidate>
        <div class="campo-grupo">
          <label for="filtro-nombre">Nombre</label>
          <input
            type="search"
            id="filtro-nombre"
            name="nombre"
            placeholder="Ej. Arrabiata"
            value="${this.escaparHTML(valores.nombre || '')}"
          >
        </div>
        <div class="campo-grupo">
          <label for="filtro-categoria">Categoría</label>
          <select id="filtro-categoria" name="categoria">
            ${this.renderizarOpciones(
              this.categorias,
              categoria => typeof categoria === 'string' ? categoria : categoria.strCategory,
              valores.categoria,
              'Todas las categorías'
            )}
          </select>
        </div>
        <div class="campo-grupo">
          <label for="filtro-origen">Origen</label>
          <select id="filtro-origen" name="origen">
            ${this.renderizarOpciones(
              this.origenes,
              origen => typeof origen === 'string' ? origen : origen.strArea,
              valores.origen,
              'Todos los orígenes'
            )}
          </select>
        </div>
        <div class="campo-grupo">
          <label for="filtro-ingrediente">Ingrediente</label>
          <input
            type="search"
            id="filtro-ingrediente"
            name="ingrediente"
            placeholder="Ej. Chicken"
            value="${this.escaparHTML(valores.ingrediente || '')}"
          >
        </div>
        <p class="mensaje-validacion" role="status" aria-live="polite"></p>
        <div class="form-acciones">
          <button type="submit" class="btn-primario">Buscar</button>
          <button type="reset" class="btn-secundario">Limpiar</button>
        </div>
      </form>
    `;
  }

  obtenerCriterios(formulario) {
    const datos = new FormData(formulario);
    return {
      nombre: String(datos.get('nombre') || '').trim(),
      categoria: String(datos.get('categoria') || ''),
      origen: String(datos.get('origen') || ''),
      ingrediente: String(datos.get('ingrediente') || '').trim()
    };
  }

  montar() {
    this.contenedor.innerHTML = this.render();
    const formulario = this.contenedor.querySelector('form');
    const mensaje = formulario.querySelector('.mensaje-validacion');

    formulario.addEventListener('submit', evento => {
      evento.preventDefault();
      const criterios = this.obtenerCriterios(formulario);

      if (!Object.values(criterios).some(Boolean)) {
        mensaje.textContent = 'Debes indicar al menos un criterio de búsqueda.';
        formulario.querySelector('[name="nombre"]').focus();
        return;
      }

      mensaje.textContent = '';
      if (typeof this.onBuscar === 'function') {
        this.onBuscar(criterios);
      } else {
        window.dispatchEvent(new CustomEvent('app:buscar-recetas', {
          detail: { criterios }
        }));
      }
    });

    formulario.addEventListener('reset', () => {
      mensaje.textContent = '';
      if (typeof this.onLimpiar === 'function') {
        this.onLimpiar();
      } else {
        window.dispatchEvent(new CustomEvent('app:limpiar-busqueda'));
      }
    });

    return formulario;
  }
}
