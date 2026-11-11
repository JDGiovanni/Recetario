class App {
  constructor() {
    this.estadoGlobal = {
      comparador: [],
      ultimaVistaOrigen: { ruta: '#inicio', estado: null }
    };

    this.vistaActualInstancia = null;
    this.contenedores = {
      app: document.getElementById('app-content'),
      navbar: document.getElementById('navbar-container'),
      modal: document.getElementById('modal-container')
    };

    this.init();
  }

  init() {
    window.addEventListener('hashchange', () => this.manejarRuta());
    window.addEventListener('DOMContentLoaded', () => {
      this.inicializarNavegacionGlobal();
      this.manejarRuta();
    });

    window.addEventListener('app:cambiar-vista', (e) => {
      const { ruta, estado } = e.detail;
      window.location.hash = ruta;
    });

    window.addEventListener('app:agregar-comparador', (e) => {
      this.gestionarComparador(e.detail.receta);
    });
  }

  inicializarNavegacionGlobal() {

    document.body.addEventListener('click', (e) => {
      if (e.target.matches('[data-link]')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        window.location.hash = href;
      }
    });
  }

  async manejarRuta() {
    const hash = window.location.hash || '#inicio';
    const [rutaBase, parametro] = hash.split('/');

    if (this.vistaActualInstancia && typeof this.vistaActualInstancia.destruir === 'function') {
      this.vistaActualInstancia.destruir();
      this.vistaActualInstancia = null;
    }

    this.contenedores.app.innerHTML = '';

    switch (rutaBase) {
      case '#inicio':
        this.renderizarPlaceholderVista('Inicio');
        break;

      case '#explorar':
        this.renderizarPlaceholderVista('Explorar');
        break;

      case '#detalle':
        this.renderizarPlaceholderVista(`Detalle de Receta ID: ${parametro || 'N/A'}`);
        break;

      case '#categorias':
        this.renderizarPlaceholderVista('Categorías y Orígenes');
        break;

      case '#comparador':
        this.renderizarPlaceholderVista('Comparador de Recetas');
        break;

      default:
        window.location.hash = '#inicio';
        break;
    }
  }

  renderizarPlaceholderVista(nombreVista) {
    const div = document.createElement('div');
    div.style.padding = '2rem';
    div.style.textAlign = 'center';
    div.innerHTML = `<h2>Vista: ${nombreVista}</h2><p>Construyéndose paso a paso...</p>`;
    this.contenedores.app.appendChild(div);
  }

  gestionarComparador(receta) {
    const index = this.estadoGlobal.comparador.findIndex(r => r.idMeal === receta.idMeal);
    
    if (index !== -1) {
      console.log('La receta ya está en el comparador');
      return;
    }

    if (this.estadoGlobal.comparador.length < 2) {
      this.estadoGlobal.comparador.push(receta);
      console.log('Receta agregada al comparador:', receta.strMeal);
    } else {
        
      console.log('El comparador está lleno (2/2). Se requerirá gestionar reemplazo.');
    }
  }
}

const app = new App();
