class PasosPreparacion {
  constructor(contenedor, pasos = []) {
    if (!contenedor) {
      throw new TypeError('PasosPreparacion requiere un contenedor.');
    }

    this.contenedor = contenedor;
    this.pasos = this.normalizar(pasos);
    this.render();
  }

  normalizar(pasos) {
    if (Array.isArray(pasos)) {
      return pasos.map(paso => String(paso ?? '').trim()).filter(Boolean);
    }
    if (typeof pasos !== 'string' || !pasos.trim()) return [];

    const texto = pasos.replace(/\r\n?/g, '\n').trim();
    let lineas = texto.split(/\n+/).map(linea => linea.trim()).filter(Boolean);
    if (lineas.length === 1 && /(?:^|\s)(?:step\s*\d+|\d+[.)])\s+/i.test(lineas[0])) {
      lineas = lineas[0]
        .split(/\s+(?=(?:step\s*\d+|\d+[.)])\s+)/i)
        .map(linea => linea.trim())
        .filter(Boolean);
    }

    return lineas.map(linea =>
      linea.replace(/^(?:step\s*\d+\s*[:.)-]?|\d+[.)])\s*/i, '').trim()
    ).filter(Boolean);
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

  render() {
    if (!this.pasos.length) {
      this.contenedor.innerHTML = '<p class="estado-vacio">No hay instrucciones de preparación disponibles.</p>';
      return;
    }

    this.contenedor.innerHTML = `
      <ol class="lista-pasos">
        ${this.pasos.map(paso => `<li>${this.escaparHTML(paso)}</li>`).join('')}
      </ol>
    `;
  }

  actualizar(pasos) {
    this.pasos = this.normalizar(pasos);
    this.render();
  }

  destruir() {
    this.contenedor.replaceChildren();
  }
}
