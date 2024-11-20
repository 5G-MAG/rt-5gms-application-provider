export async function fetchHtmlForm(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load HTML from ${path}`);
    }
    return response.text();
  }