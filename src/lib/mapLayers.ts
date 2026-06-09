import type { Map, ExpressionSpecification, MapLayerMouseEvent } from 'mapbox-gl';
// The parcel-interaction zoom gate now lives in @aireon/shared so every
// map-first app shares ONE threshold + predicate — change it there and the
// whole suite moves together. Imported here (and re-exported below) so this
// module stays the local entry point its callers and tests already use.
import { PARCEL_INTERACTION_MIN_ZOOM, isParcelInteractive } from '@aireon/shared/map-interaction';

/**
 * Identity + percentile-breakpoints of the zone the choropleth is currently
 * painting. `null` means no parcel is selected, so every parcel reads as a
 * faint neutral wash.
 *
 * `breakpoints` are the zone's ratio_v percentiles [p5, p25, p50, p75, p95]
 * pulled from /zone_stats. When they're absent (the stats haven't landed yet,
 * or the zone is too sparse) the paint falls back to absolute utilisation
 * thresholds so the map still lights up the instant a parcel is clicked.
 */
export interface ActiveZone {
  fso: number;
  czLocal: string;
  /** ratio_v percentiles [p5,p25,p50,p75,p95]; omitted → absolute thresholds. */
  breakpoints?: number[];
}

// Sequential "utilisation heat" ramp — soft amber (under-built, lots of
// headroom) → deep red (at/over the zone allowance). Kept in the same hue
// family as PercentileGauge.rampColor so the panel gauge and the map read as
// one scale. Five stops pair with the five percentile breakpoints.
export const DENSITY_RAMP = ['#FCD9A8', '#FBBF24', '#FB923C', '#EF4444', '#991B1B'];
// Absolute ratio_v (%) fallback stops: 0 → empty plot, 100 → exactly the
// zone's allowed volume, 200+ → heavily over-built.
const ABSOLUTE_STOPS = [0, 50, 100, 150, 220];

/** Coerce breakpoints into a strictly-increasing 5-stop list for `interpolate`
 *  (Mapbox throws on equal/descending input stops, common in sparse zones). */
function safeStops(bp?: number[]): number[] {
  const base = bp && bp.length === 5 && bp.every((n) => Number.isFinite(n)) ? bp : ABSOLUTE_STOPS;
  const out = [base[0]];
  for (let i = 1; i < base.length; i++) {
    out.push(base[i] > out[i - 1] ? base[i] : out[i - 1] + 1e-3);
  }
  return out;
}

/** `true` when a feature belongs to the active zone (same FSO + cz_local). */
function inZone(zone: ActiveZone): ExpressionSpecification {
  return [
    'all',
    ['==', ['to-number', ['get', 'fso_num_2021']], zone.fso],
    ['==', ['get', 'cz_local'], zone.czLocal],
  ];
}

/**
 * fill-color expression: in-zone parcels are coloured by their own ratio_v
 * mapped through the zone's percentile breakpoints (so the colour literally
 * answers "where does this parcel sit in its zone?"); out-of-zone parcels go
 * a flat dark slate so the active zone reads as the figure against ground.
 */
export function densityFillColor(zone: ActiveZone | null): ExpressionSpecification {
  if (!zone) return '#475569' as unknown as ExpressionSpecification;
  const s = safeStops(zone.breakpoints);
  return [
    'case',
    inZone(zone),
    [
      'interpolate',
      ['linear'],
      ['to-number', ['coalesce', ['get', 'ratio_v'], 0]],
      s[0], DENSITY_RAMP[0],
      s[1], DENSITY_RAMP[1],
      s[2], DENSITY_RAMP[2],
      s[3], DENSITY_RAMP[3],
      s[4], DENSITY_RAMP[4],
    ],
    '#334155',
  ];
}

/** fill-opacity expression: bright inside the active zone, near-invisible
 *  outside it. With no zone selected the whole layer is a faint wash. */
export function densityFillOpacity(zone: ActiveZone | null, opacity: number): ExpressionSpecification {
  if (!zone) return (opacity * 0.1) as unknown as ExpressionSpecification;
  return ['case', inZone(zone), opacity * 0.82, opacity * 0.05];
}

/** line-color expression for the parcel hairline — neutral everywhere, a hair
 *  brighter inside the active zone to crisp-up the highlighted block. */
export function densityLineColor(zone: ActiveZone | null): ExpressionSpecification {
  if (!zone) return '#64748b' as unknown as ExpressionSpecification;
  return ['case', inZone(zone), '#cbd5e1', '#475569'];
}

/** line-opacity expression — subtle, and almost gone for out-of-zone parcels
 *  so the active zone is unmistakable. Scales with the user's opacity slider. */
export function densityLineOpacity(zone: ActiveZone | null, opacity: number): ExpressionSpecification {
  if (!zone) return (opacity * 0.45) as unknown as ExpressionSpecification;
  return ['case', inZone(zone), opacity * 0.7, opacity * 0.12];
}

// Re-export the suite-wide parcel-interaction zoom gate (PARCEL_INTERACTION_MIN_ZOOM
// = block level; isParcelInteractive(zoom) = the predicate). Both gate the
// hover-highlight (below) and the click-to-select in MapView, sharing one source
// of truth in @aireon/shared so they can never drift apart from the rest of the suite.
export { PARCEL_INTERACTION_MIN_ZOOM, isParcelInteractive };

/** Maps whose hover interaction is already wired, so re-adding the parcel
 *  layers after a basemap style swap doesn't stack duplicate listeners. */
const hoverWiredMaps = new WeakSet<Map>();

/**
 * Wire the parcel hover-highlight, gated on zoom for performance. The
 * layer-scoped mousemove hit-test and the per-move `setFilter` are bound only
 * at/above PARCEL_INTERACTION_MIN_ZOOM and detached below it, so a zoomed-out map does
 * no hover work at all. Map/delegated listeners survive `setStyle`, so this is
 * guarded to run once per map even though `addParcelLayers` re-runs on every
 * basemap swap.
 */
export function wireParcelHover(map: Map) {
  if (hoverWiredMaps.has(map)) return;
  hoverWiredMaps.add(map);

  // The hover layer is briefly absent between a basemap setStyle() and its
  // style.load re-add; a zoom/move event landing in that window would otherwise
  // throw "layer does not exist", so both helpers no-op until it's back.
  const onMove = (e: MapLayerMouseEvent) => {
    if (!map.getLayer('parcel-hover')) return;
    map.getCanvas().style.cursor = 'pointer';
    if (e.features?.length) {
      const id = e.features[0].properties?.parcel_id ?? '';
      map.setFilter('parcel-hover', ['==', ['get', 'parcel_id'], id]);
    }
  };
  const clearHover = () => {
    map.getCanvas().style.cursor = '';
    if (!map.getLayer('parcel-hover')) return;
    map.setFilter('parcel-hover', ['==', ['get', 'parcel_id'], '']);
  };

  // Attach/detach the hover listeners as the map crosses the zoom threshold so
  // there's literally zero per-mousemove cost while zoomed out.
  let bound = false;
  const syncHover = () => {
    const want = isParcelInteractive(map.getZoom());
    if (want === bound) return;
    bound = want;
    if (want) {
      map.on('mousemove', 'parcel-fill', onMove);
      map.on('mouseleave', 'parcel-fill', clearHover);
    } else {
      map.off('mousemove', 'parcel-fill', onMove);
      map.off('mouseleave', 'parcel-fill', clearHover);
      clearHover(); // drop any lingering highlight + pointer cursor
    }
  };

  map.on('zoomend', syncHover);
  syncHover(); // honour the initial zoom (e.g. a ?lat/?lng deep-link at z≥17)
}

export function addParcelLayers(map: Map, opacity: number, zone: ActiveZone | null = null) {
  if (!map.getSource('parcel-tiles')) {
    map.addSource('parcel-tiles', {
      type: 'vector',
      url: 'https://res-mbtiles-x.gisjoe.com/parcel_2025_07_z12_16',
      // The parcel tiles carry the federal EGRID in their `parcel_id` field
      // (there is NO `egrid` field — verified against the live TileJSON). We
      // promote it into Mapbox's feature `id` slot so the selected-parcel and
      // hover filters key correctly.
      promoteId: 'parcel_id',
    });
  }

  if (!map.getLayer('parcel-fill')) {
    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        // Data-driven straight off the tile's own `ratio_v` — no round-trip
        // and no feature-state needed, so the choropleth paints the instant
        // tiles load. MapView re-applies these on selection / zone-switch.
        'fill-color': densityFillColor(zone),
        'fill-opacity': densityFillOpacity(zone, opacity),
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
        // A faint neutral hairline just delineates parcels; the density FILL
        // is the signal, so the outline must not compete with it. MapView
        // makes it zone-aware (brighter inside the active zone) on selection.
        'line-color': densityLineColor(zone),
        'line-width': zone ? ['case', inZone(zone), 1, 0.4] : 0.5,
        'line-opacity': densityLineOpacity(zone, opacity),
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
      // Never tessellate/paint the hover layer below block level — paired with
      // the zoom-gated listeners in wireParcelHover, the whole hover
      // interaction costs nothing while the map is zoomed out.
      minzoom: PARCEL_INTERACTION_MIN_ZOOM,
      filter: ['==', ['get', 'parcel_id'], ''],
    });
  }

  // Re-runs on every basemap swap; wireParcelHover is idempotent per map.
  wireParcelHover(map);

  if (!map.getLayer('parcel-selected')) {
    // White casing under a crisp inner line so "your parcel" pops cleanly
    // against the warm density ramp (an amber outline would blend into it).
    map.addLayer({
      id: 'parcel-selected-casing',
      type: 'line',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        'line-color': '#ffffff',
        'line-width': 5,
        'line-opacity': 0.9,
        'line-blur': 0.5,
      },
      filter: ['==', ['get', 'parcel_id'], ''],
    });
    map.addLayer({
      id: 'parcel-selected',
      type: 'line',
      source: 'parcel-tiles',
      'source-layer': 'parcel_2025_07',
      paint: {
        'line-color': '#0ea5e9',
        'line-width': 2,
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
