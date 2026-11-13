class PasosPreparacion {
  constructor(contenedor, pasos = []) {
    this.contenedor = contenedor;
    this.pasos = pasos;
    this.render();
  }
  render() {
    this.contenedor.innerHTML = `
      <ol class="lista-pasos">
        ${this.pasos.map(p => `<li>${p}</li>`).join('')}
      </ol>
    `;
  }
  destruir() { this.contenedor.innerHTML = ''; }
}
