const BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

async function peticionAPI(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('Error en petición API:', error);
    throw error;
  }
}
