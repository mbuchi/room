// Publishable client token — restricted by domain in the Mapbox console.
// Set in Vercel project env (Production + Preview) as VITE_MAPBOX_TOKEN.
// Falls back to an empty string in local dev — Mapbox will then refuse to
// render tiles, which is a louder failure than a silent 401.
export const MAPBOX_TOKEN: string = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';

export const DEFAULT_CENTER: [number, number] = [8.894175, 47.556806];
export const DEFAULT_ZOOM = 16.5;

export interface BasemapOption {
  id: string;
  name: string;
  style: string;
}

export const basemapOptions: BasemapOption[] = [
  { id: 'dark', name: 'Dark', style: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'streets', name: 'Streets', style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'satellite-streets', name: 'Satellite Streets', style: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'light', name: 'Light', style: 'mapbox://styles/mapbox/light-v11' },
  { id: 'outdoors', name: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'navigation-day', name: 'Navigation Day', style: 'mapbox://styles/mapbox/navigation-day-v1' },
  { id: 'navigation-night', name: 'Navigation Night', style: 'mapbox://styles/mapbox/navigation-night-v1' },
];

export const buildingVolumeLegend = [
  { color: '#deebf7', label: '0 - 100' },
  { color: '#c6dbef', label: '100 - 250' },
  { color: '#9ecae1', label: '250 - 500' },
  { color: '#6baed6', label: '500 - 1000' },
  { color: '#4292c6', label: '1000 - 2500' },
  { color: '#2171b5', label: '2500 - 5000' },
  { color: '#08519c', label: '5000 - 10000' },
  { color: '#08306b', label: '> 10000' },
];

export const BUILDING_VOLUME_COLORS: [number, string][] = [
  [0, '#deebf7'],
  [100, '#c6dbef'],
  [250, '#9ecae1'],
  [500, '#6baed6'],
  [1000, '#4292c6'],
  [2500, '#2171b5'],
  [5000, '#08519c'],
  [10000, '#08306b'],
];

export const PARCEL_RATIO_COLORS: [number, string][] = [
  [0, '#d73027'],
  [12.5, '#f46d43'],
  [25, '#fdae61'],
  [37.5, '#fee08b'],
  [50, '#d9ef8b'],
  [62.5, '#a6d96a'],
  [75, '#66bd63'],
  [87.5, '#1a9850'],
];

export function getInitialMapState() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat') || '');
  const lng = parseFloat(params.get('lng') || '');
  const zoom = parseFloat(params.get('zoom') || '');

  return {
    center: (!isNaN(lat) && !isNaN(lng) ? [lng, lat] : DEFAULT_CENTER) as [number, number],
    zoom: !isNaN(zoom) ? zoom : DEFAULT_ZOOM,
    hasUrlCoords: !isNaN(lat) && !isNaN(lng),
  };
}

export function updateUrlParams(lat: number, lng: number, zoom: number) {
  const params = new URLSearchParams(window.location.search);
  params.set('lat', lat.toFixed(6));
  params.set('lng', lng.toFixed(6));
  params.set('zoom', zoom.toFixed(2));
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}
