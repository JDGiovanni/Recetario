function normalizarIngredientes(receta) {
  const ingredientes = [];
  for (let i = 1; i <= 20; i++) {
    const ing = receta[`strIngredient${i}`];
    const medida = receta[`strMeasure${i}`];
    if (ing && ing.trim() !== '') {
      ingredientes.push({ nombre: ing.trim(), medida: medida ? medida.trim() : '' });
    }
  }
  return ingredientes;
}

function normalizarPasos(receta) {
  if (!receta.strInstructions) return [];
  return receta.strInstructions.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^step\s*\d+/i.test(l) && !/^\d+\.$/.test(l));
}