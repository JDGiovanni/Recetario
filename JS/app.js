class App {
  constructor() {
    this.estadoGlobal = {
      comparador: [],
      ultimaVistaOrigen: { ruta: '#inicio', estado: null }
    };
    this.vistaActualInstancia = null;
    this.rutaActual = null;
    this.urlScript = document.currentScript?.src;
    this.contenedores = {
      app: document.getElementById('app-content'),
      navbar: document.getElementById('navbar-container'),
      modal: document.getElementById('modal-container')
    };
    this.manejadores = {
      hashchange: () => this.manejarRuta(),
      agregarComparador: evento => this.gestionarComparador(evento.detail?.receta),
      mensaje: evento => this.mostrarMensaje(evento.detail?.mensaje)
    };
    window.app = this;
    this.init();
  }

  init() {
    if (!this.contenedores.app) {
      console.error('No se encontró el contenedor #app-content.');
      return;
    }

    window.addEventListener('hashchange', this.manejadores.hashchange);
    window.addEventListener('app:agregar-comparador', this.manejadores.agregarComparador);
    window.addEventListener('app:mensaje', this.manejadores.mensaje);
    document.body.addEventListener('click', evento => {
      const enlace = evento.target.closest?.('[data-link]');
      if (!enlace || !enlace.matches('a[href]')) return;
      evento.preventDefault();
      window.location.hash = enlace.getAttribute('href');
    });

    this.cargarComponentes()
      .then(() => {
        if (this.contenedores.navbar) {
          this.barraNavegacion = new BarraNavegacion(this.contenedores.navbar);
        }
        this.manejarRuta();
      })
      .catch(error => {
        console.error('No se pudieron cargar los componentes de la aplicación:', error);
        this.mostrarErrorInicializacion();
      });
  }

  cargarScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      document.head.appendChild(script);
    });
  }

  async cargarComponentes() {
    if (!this.urlScript) {
      throw new Error('No se pudo determinar la ubicación de app.js.');
    }

    const archivos = [
      ['BarraNavegacion.js', () => typeof BarraNavegacion === 'function'],
      ['EstadoCarga.js', () => typeof EstadoCarga === 'function'],
      ['TarjetaReceta.js', () => typeof TarjetaReceta === 'function'],
      ['Paginador.js', () => typeof Paginador === 'function'],
      ['FormularioBusqueda.js', () => typeof FormularioBusqueda === 'function'],
      ['ListaIngredientes.js', () => typeof ListaIngredientes === 'function'],
      ['PasosPreparacion.js', () => typeof PasosPreparacion === 'function'],
      ['PanelComparador.js', () => typeof PanelComparador === 'function'],
      ['TablaComparacion.js', () => typeof TablaComparacion === 'function']
    ];
    const directorio = new URL('componentes/', this.urlScript);

    for (const [archivo, yaCargado] of archivos) {
      if (!yaCargado()) {
        await this.cargarScript(new URL(archivo, directorio).href);
      }
    }
  }

  mostrarErrorInicializacion() {
    this.contenedores.app.innerHTML = `
      <section class="error-banner" role="alert">
        <h2>No se pudo iniciar la aplicación</h2>
        <p>Comprueba que los archivos JavaScript de componentes estén disponibles.</p>
        <button type="button" class="btn-primario" id="btn-reintentar-app">Reintentar</button>
      </section>
    `;
    this.contenedores.app.querySelector('#btn-reintentar-app')
      .addEventListener('click', () => window.location.reload());
  }

  analizarRuta() {
    const segmentos = (window.location.hash || '#inicio').slice(1).split('/').filter(Boolean)
      .map(segmento => {
        try {
          return decodeURIComponent(segmento);
        } catch {
          return segmento;
        }
      });
    return {
      segmentos,
      base: `#${segmentos[0] || 'inicio'}`,
      clave: `#${segmentos.join('/') || 'inicio'}`
    };
  }

  manejarRuta() {
    const ruta = this.analizarRuta();
    if (this.rutaActual === ruta.clave && this.vistaActualInstancia) return;

    if (this.vistaActualInstancia?.destruir) {
      this.vistaActualInstancia.destruir();
    }
    this.vistaActualInstancia = null;
    this.rutaActual = ruta.clave;
    this.contenedores.app.replaceChildren();

    if (ruta.base !== '#comparador' && ruta.base !== '#detalle') {
      this.estadoGlobal.ultimaVistaOrigen = {
        ruta: ruta.clave,
        estado: null
      };
    }

    const props = {
      comparador: this.estadoGlobal.comparador,
      alCambiarComparador: recetas => this.actualizarComparador(recetas),
      volver: () => this.volverAOrigen()
    };

    switch (ruta.base) {
      case '#inicio':
        this.vistaActualInstancia = new VistaInicio(this.contenedores.app, props);
        break;
      case '#explorar':
        this.vistaActualInstancia = new VistaExplorar(this.contenedores.app, props);
        break;
      case '#detalle':
        this.vistaActualInstancia = new VistaDetalle(
          this.contenedores.app,
          { ...props, id: ruta.segmentos[1] }
        );
        break;
      case '#categorias':
        this.vistaActualInstancia = new VistaCategoriasOrigenes(
          this.contenedores.app,
          {
            ...props,
            tipo: ruta.segmentos[1] === 'ori' || ruta.segmentos[1] === 'origen'
              ? 'origenes'
              : 'categorias',
            seleccion: ruta.segmentos[2] || (ruta.segmentos[1] !== 'cat' && ruta.segmentos[1] !== 'ori'
              ? ruta.segmentos[1]
              : null)
          }
        );
        break;
      case '#comparador':
        this.vistaActualInstancia = new VistaComparador(this.contenedores.app, props);
        break;
      default:
        this.rutaActual = null;
        window.location.hash = '#inicio';
    }
  }

  volverAOrigen() {
    const ruta = this.estadoGlobal.ultimaVistaOrigen?.ruta || '#explorar';
    window.location.hash = ruta.startsWith('#detalle') ? '#explorar' : ruta;
  }

  actualizarComparador(recetas) {
    if (!Array.isArray(recetas)) {
      throw new TypeError('El comparador debe actualizarse con una lista de recetas.');
    }
    this.estadoGlobal.comparador = recetas.slice(0, 2);
    if (this.vistaActualInstancia instanceof VistaComparador) {
      this.vistaActualInstancia.actualizar(this.estadoGlobal.comparador);
    }
    window.dispatchEvent(new CustomEvent('app:comparador-actualizado', {
      detail: { recetas: [...this.estadoGlobal.comparador] }
    }));
  }

  gestionarComparador(receta, indice = null) {
    if (!receta || !receta.idMeal) {
      this.mostrarMensaje('No se pudo agregar una receta sin identificador.');
      return false;
    }

    const recetas = [...this.estadoGlobal.comparador];
    const indiceExistente = recetas.findIndex(item => item.idMeal === receta.idMeal);
    if (indiceExistente !== -1 && indiceExistente !== indice) {
      this.mostrarMensaje('Esa receta ya está en el comparador.');
      return false;
    }

    if (Number.isInteger(indice)) {
      if (indice < 0 || indice > 1) {
        this.mostrarMensaje('El panel seleccionado no es válido.');
        return false;
      }
      recetas[indice] = receta;
    } else {
      if (recetas.length >= 2) {
        this.mostrarMensaje('El comparador está lleno. Quita o reemplaza una receta.');
        return false;
      }
      recetas.push(receta);
    }

    this.actualizarComparador(recetas);
    this.mostrarMensaje(`"${receta.strMeal || 'Receta'}" se agregó al comparador.`);
    return true;
  }

  mostrarMensaje(mensaje) {
    if (!mensaje) return;
    let aviso = document.getElementById('app-aviso');
    if (!aviso) {
      aviso = document.createElement('div');
      aviso.id = 'app-aviso';
      aviso.setAttribute('role', 'status');
      aviso.setAttribute('aria-live', 'polite');
      document.body.appendChild(aviso);
    }
    aviso.textContent = mensaje;
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => aviso.remove(), 3500);
  }
}

const app = new App();
