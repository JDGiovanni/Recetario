class ListaIngredientes {
  constructor(contenedor, ingredientes = []) {
    this.contenedor = contenedor;
    this.ingredientes = ingredientes;
    this.render();
  }
  render() {
    this.contenedor.innerHTML = `
      <div class="grid-ingredientes">
        ${this.ingredientes.map(i => `
          <div class="ingrediente-item">
            <img src="https://www.themealdb.com/images/ingredients/${encodeURIComponent(i.nombre)}.png" alt="${i.nombre}" onerror="this.src='assets/placeholder.png'">
            <span>${i.medida} <strong>${i.nombre}</strong></span>
          </div>
        `).join('')}
      </div>
    `;
  }
  destruir() { this.contenedor.innerHTML = ''; }
}
