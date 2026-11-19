function calcularSimilitudIngredientes(ingsA, ingsB) {
  const setA = new Set(ingsA.map(i => i.toLowerCase()));
  const setB = new Set(ingsB.map(i => i.toLowerCase()));
  const comunes = [...setA].filter(i => setB.has(i));
  const totalDistintos = new Set([...setA, ...setB]).size;
  return totalDistintos > 0 ? Math.round((comunes.length / totalDistintos) * 100) : 0;
}