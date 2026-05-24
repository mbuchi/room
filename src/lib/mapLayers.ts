import type { Map } from 'mapbox-gl';

export function addParcelLayers(map: Map, opacity: number) {
  if (!map.getSource('parcel-tiles')) {
    map.addSource('parcel-tiles', {
      type: 'vector',
      url: 'https://res-mbtiles-x.gisjoe.com/parcel_2025_07_z12_16',
      // `promoteId` lifts the per-feature EGRID into Mapbox's `id` slot so
      // `setFeatureState({source, id: egrid}, …)` keys correctly. Without
      // this, feature-state is unaddressable per parcel and the choropleth
      // in room can't paint.
      promoteId: 'egrid',
    });
  }

  if (!map.getLayer('parcel-fill')) {
    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        // When ZonePanel paints feature-state with a `percentile` 0..1, this
        // expression interpolates a sequential light-yellow → deep-red ramp
        // so densely-utilised parcels read darker than under-built ones.
        // Parcels with no feature-state (or an out-of-zone) fall back to
        // groove's neutral grey via `case` + `coalesce`.
        'fill-color': [
          'case',
          ['==', ['feature-state', 'percentile'], null],
          '#d1d5db',
          [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'percentile'], 0],
            0, '#FEF3C7',
            0.25, '#FDE68A',
            0.5, '#FB923C',
            0.75, '#DC2626',
            1, '#7F1D1D',
          ],
        ],
        // Painted parcels read more strongly than the neutral fallback so
        // the user actually sees the density gradient.
        'fill-opacity': [
          'case',
          ['==', ['feature-state', 'percentile'], null],
          opacity * 0.12,
          opacity * 0.55,
        ],
      },
    });
  }

  if (!map.getLayer('parcel-outline')) {
    map.addLayer({
      id: 'parcel-outline',
      type: 'line',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        'line-color': '#f87171',
        'line-width': 1,
        'line-opacity': opacity,
      },
    });
  }

  if (!map.getLayer('parcel-hover')) {
    map.addLayer({
      id: 'parcel-hover',
      type: 'fill',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        'fill-color': '#fbbf24',
        'fill-opacity': 0.25,
      },
      filter: ['==', ['get', 'parcel_id'], ''],
    });

    map.on('mousemove', 'parcel-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features?.length) {
        const id = e.features[0].properties?.parcel_id ?? '';
        map.setFilter('parcel-hover', ['==', ['get', 'parcel_id'], id]);
      }
    });

    map.on('mouseleave', 'parcel-fill', () => {
      map.getCanvas().style.cursor = '';
      map.setFilter('parcel-hover', ['==', ['get', 'parcel_id'], '']);
    });
  }

  if (!map.getLayer('parcel-selected')) {
    map.addLayer({
      id: 'parcel-selected',
      type: 'line',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        'line-color': '#fbbf24',
        'line-width': 3,
        'line-opacity': 1,
      },
      filter: ['==', ['get', 'parcel_id'], ''],
    });
  }
}

export function addBuildingLayers(map: Map, opacity: number) {
  if (!map.getSource('building-tiles')) {
    map.addSource('building-tiles', {
      type: 'vector',
      url: 'https://res-mbtiles-footprint-x.gisjoe.com/footprint_cityjson',
    });
  }

  if (!map.getLayer('building-fill')) {
    map.addLayer({
      id: 'building-fill',
      type: 'fill',
      source: 'building-tiles',
      'source-layer': 'footprint_cityjson',
      paint: {
        'fill-color': '#9ca3af',
        'fill-opacity': opacity * 0.35,
      },
    });

    map.addLayer({
      id: 'building-outline',
      type: 'line',
      source: 'building-tiles',
      'source-layer': 'footprint_cityjson',
      paint: {
        'line-color': '#6b7280',
        'line-width': 0.8,
      },
    });

  }
}

export function addBuildingExtrusion(map: Map, opacity: number) {
  if (!map.getLayer('building-extrusion')) {
    map.addLayer({
      id: 'building-extrusion',
      type: 'fill-extrusion',
      source: 'building-tiles',
      'source-layer': 'footprint_cityjson',
      paint: {
        'fill-extrusion-color': '#9ca3af',
        'fill-extrusion-height': [
          'max',
          ['-',
            ['coalesce', ['get', 'rf_h_roof_70p'], 0],
            ['coalesce', ['get', 'rf_h_ground'], 0],
          ],
          0,
        ],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': opacity,
      },
    });
  }
}
