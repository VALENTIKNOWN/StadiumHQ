const loaded: Record<string, Promise<void>> = {};

export function loadExternalScript(src: string) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise<void>((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`);
    if (exists) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
  return loaded[src];
}
