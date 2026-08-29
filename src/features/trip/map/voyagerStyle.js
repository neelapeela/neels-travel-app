/**
 * Mapbox Streets v8 vectors restyled with Carto Voyager colors.
 * Place/road labels only — no POI, transit, or house-number clutter.
 * Palette from CartoDB/basemap-styles `voyager_vars.json`.
 */

const FONT = ['DIN Offc Pro Regular', 'Arial Unicode MS Regular']
const FONT_MED = ['DIN Offc Pro Medium', 'Arial Unicode MS Regular']

const C = {
  land: '#fbf8f3',
  urban: '#f3eadc',
  green: '#C5E1B2',
  greenHigh: '#e0ecd3',
  water: '#b0d0d6',
  river: '#cce7ea',
  building: '#f6efe4',
  buildingOutline: '#e9d8be',
  motorway: '#FFE9A5',
  motorwayCase: '#fbdb98',
  main: '#fefdd7',
  mainCase: '#ffeabb',
  street: '#ffffff',
  minorCase: '#fdebce',
  path: '#d7d7d7',
  rail: '#dddddd',
  admin: '#ead5d7',
  place: '#405c78',
  placeHalo: '#f2f5f8',
  waterLabel: '#51909c',
  waterHalo: '#e2eef0',
  roadText: '#6a7584',
  motorwayHalo: '#fff0c4',
  primaryHalo: '#fefde1'
}

function landuseFilter(...classes) {
  return ['match', ['get', 'class'], classes, true, false]
}

export function createVoyagerStyle() {
  return {
    version: 8,
    name: 'Travel Voyager',
    sources: {
      composite: {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8'
      }
    },
    sprite: 'mapbox://sprites/mapbox/light-v11',
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': C.land } },
      {
        id: 'landuse-urban',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        filter: landuseFilter('residential', 'industrial', 'commercial', 'school', 'hospital', 'parking'),
        paint: { 'fill-color': C.urban, 'fill-opacity': 0.55 }
      },
      {
        id: 'landuse-green',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        filter: landuseFilter('park', 'national_park', 'wood', 'grass', 'scrub', 'cemetery', 'pitch', 'golf_course'),
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            C.green,
            16,
            C.greenHigh
          ]
        }
      },
      {
        id: 'landuse-sand',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        filter: landuseFilter('sand', 'glacier'),
        paint: { 'fill-color': '#f3edd8' }
      },
      {
        id: 'water',
        type: 'fill',
        source: 'composite',
        'source-layer': 'water',
        paint: { 'fill-color': C.water }
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'composite',
        'source-layer': 'waterway',
        paint: {
          'line-color': C.river,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 2]
        }
      },
      {
        id: 'building',
        type: 'fill',
        source: 'composite',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': C.building,
          'fill-outline-color': C.buildingOutline,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, 1]
        }
      },
      {
        id: 'admin',
        type: 'line',
        source: 'composite',
        'source-layer': 'admin',
        filter: ['==', ['get', 'admin_level'], 2],
        paint: {
          'line-color': C.admin,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 8, 1.2]
        }
      },
      {
        id: 'road-path',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 13,
        filter: ['match', ['get', 'class'], ['path', 'track', 'pedestrian'], true, false],
        paint: {
          'line-color': C.path,
          'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 18, 2]
        }
      },
      {
        id: 'road-minor-case',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 12,
        filter: ['match', ['get', 'class'], ['street', 'street_limited', 'service', 'tertiary'], true, false],
        paint: {
          'line-color': C.minorCase,
          'line-gap-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 18, 8],
          'line-width': 1.1
        }
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 11,
        filter: ['match', ['get', 'class'], ['street', 'street_limited', 'service', 'tertiary'], true, false],
        paint: {
          'line-color': C.street,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.6, 18, 8]
        }
      },
      {
        id: 'road-main-case',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 8,
        filter: ['match', ['get', 'class'], ['primary', 'primary_link', 'secondary', 'secondary_link'], true, false],
        paint: {
          'line-color': C.mainCase,
          'line-gap-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 18, 10],
          'line-width': 1.2
        }
      },
      {
        id: 'road-main',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 6,
        filter: ['match', ['get', 'class'], ['primary', 'primary_link', 'secondary', 'secondary_link'], true, false],
        paint: {
          'line-color': C.main,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 18, 10]
        }
      },
      {
        id: 'road-motorway-case',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 5,
        filter: ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk', 'trunk_link'], true, false],
        paint: {
          'line-color': C.motorwayCase,
          'line-gap-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 18, 12],
          'line-width': 1.3
        }
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 4,
        filter: ['match', ['get', 'class'], ['motorway', 'motorway_link', 'trunk', 'trunk_link'], true, false],
        paint: {
          'line-color': C.motorway,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 18, 12]
        }
      },
      {
        id: 'rail',
        type: 'line',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 12,
        filter: ['match', ['get', 'class'], ['major_rail', 'minor_rail'], true, false],
        paint: {
          'line-color': C.rail,
          'line-width': 1,
          'line-dasharray': [2, 2]
        }
      },
      {
        id: 'water-label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'natural_label',
        minzoom: 5,
        filter: ['==', ['get', 'class'], 'water'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 12, 16],
          'text-max-width': 6
        },
        paint: {
          'text-color': C.waterLabel,
          'text-halo-color': C.waterHalo,
          'text-halo-width': 1.2
        }
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 12,
        filter: [
          'match',
          ['get', 'class'],
          ['motorway', 'trunk', 'primary', 'secondary'],
          true,
          false
        ],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 13],
          'text-max-angle': 30
        },
        paint: {
          'text-color': C.roadText,
          'text-halo-color': [
            'match',
            ['get', 'class'],
            'motorway',
            C.motorwayHalo,
            'trunk',
            C.motorwayHalo,
            C.primaryHalo
          ],
          'text-halo-width': 1.2
        }
      },
      {
        id: 'place-neighbourhood',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        minzoom: 12,
        maxzoom: 16,
        filter: ['match', ['get', 'type'], ['neighbourhood', 'suburb'], true, false],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT,
          'text-size': 11,
          'text-max-width': 7
        },
        paint: {
          'text-color': C.place,
          'text-halo-color': C.placeHalo,
          'text-halo-width': 1.2
        }
      },
      {
        id: 'place-town',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        minzoom: 8,
        filter: ['match', ['get', 'type'], ['town', 'village'], true, false],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 15],
          'text-max-width': 8
        },
        paint: {
          'text-color': C.place,
          'text-halo-color': C.placeHalo,
          'text-halo-width': 1.4
        }
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        filter: ['==', ['get', 'type'], 'city'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_MED,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 12, 20],
          'text-max-width': 8
        },
        paint: {
          'text-color': C.place,
          'text-halo-color': C.placeHalo,
          'text-halo-width': 1.5
        }
      },
      {
        id: 'place-country',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        maxzoom: 8,
        filter: ['==', ['get', 'type'], 'country'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_MED,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 6, 18],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.08
        },
        paint: {
          'text-color': '#6b7d91',
          'text-halo-color': C.land,
          'text-halo-width': 1.4
        }
      }
    ]
  }
}

export const VOYAGER_LAND_COLOR = C.land
