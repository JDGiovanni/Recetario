class CacheMemoria {
  constructor() {
    this.cacheRecetas = new Map();
    this.cacheListas = new Map();
  }

  obtenerReceta(id) {
    return this.cacheRecetas.get(id);
  }

  guardarReceta(id, receta) {
    this.cacheRecetas.set(id, receta);
  }

  obtenerLista(key) {
    return this.cacheListas.get(key);
  }

  guardarLista(key, lista) {
    this.cacheListas.set(key, lista);
  }
}
const cacheGlobal = new CacheMemoria();