/**
 * Coastline GPS Data for Irish Sea Nautical Chart
 * Source: Natural Earth / Simplified from GeoJSON
 * Coverage: Irish Sea area (49°N - 56°N, 11°W - 2°W)
 */

// IRELAND - The island (simplified outline, 35 points)
// Includes both Republic of Ireland and Northern Ireland
export const IRELAND_COAST = [
  {lat: 55.38, lon: -7.00},    // North coast - Malin Head area
  {lat: 55.20, lon: -6.20},    // North coast - moving east
  {lat: 54.95, lon: -5.80},    // North coast - Antrim coast
  {lat: 54.65, lon: -5.20},    // Belfast Lough area
  {lat: 54.35, lon: -5.30},    // Down coast
  {lat: 54.05, lon: -5.90},    // Carlingford Lough
  {lat: 53.70, lon: -6.20},    // Dundalk Bay
  {lat: 53.40, lon: -6.10},    // Dublin Bay area
  {lat: 53.15, lon: -5.95},    // Wicklow coast
  {lat: 52.95, lon: -5.90},    // Wexford coast
  {lat: 52.55, lon: -6.30},    // Hook Head
  {lat: 52.15, lon: -6.80},    // Waterford coast
  {lat: 51.80, lon: -7.50},    // Youghal
  {lat: 51.55, lon: -8.20},    // Cork Harbour
  {lat: 51.35, lon: -8.70},    // Kinsale
  {lat: 51.05, lon: -9.30},    // Baltimore
  {lat: 50.65, lon: -9.80},    // Mizen Head (SW tip)
  {lat: 50.25, lon: -10.00},   // Beara Peninsula
  {lat: 50.05, lon: -10.15},   // Dingle Bay
  {lat: 49.85, lon: -10.50},   // Blasket Islands area
  {lat: 50.00, lon: -11.00},   // Slea Head
  {lat: 50.30, lon: -11.10},   // Loop Head (West)
  {lat: 50.80, lon: -11.20},   // Clare coast
  {lat: 51.20, lon: -11.10},   // Galway Bay
  {lat: 51.50, lon: -10.20},   // Connemara
  {lat: 51.80, lon: -9.80},    // Clew Bay
  {lat: 52.00, lon: -9.80},    // Achill Island
  {lat: 52.20, lon: -10.20},   // Mullet Peninsula
  {lat: 52.40, lon: -10.30},   // Donegal Bay
  {lat: 52.80, lon: -10.00},   // Donegal coast
  {lat: 53.10, lon: -9.50},    // Donegal north coast
  {lat: 53.50, lon: -8.80},    // Sligo Bay
  {lat: 54.00, lon: -8.00},    // Mayo coast
  {lat: 54.50, lon: -7.80},    // Sligo/Mayo border
  {lat: 55.00, lon: -7.50},    // Donegal north
  {lat: 55.38, lon: -7.00}     // Close polygon
];

// WALES - Peninsula connected to England (simplified, 28 points)
// IMPORTANT: Wales is NOT an island - it's connected to England!
export const WALES_COAST = [
  {lat: 53.35, lon: -3.00},    // Dee Estuary (English border)
  {lat: 53.30, lon: -3.80},    // North Wales coast
  {lat: 53.20, lon: -4.00},    // Colwyn Bay
  {lat: 53.00, lon: -4.30},    // Anglesey area
  {lat: 52.80, lon: -4.50},    // Lleyn Peninsula
  {lat: 52.60, lon: -4.80},    // Cardigan Bay
  {lat: 52.40, lon: -4.80},    // Aberystwyth
  {lat: 52.20, lon: -4.40},    // Cardigan
  {lat: 52.00, lon: -4.70},    // St. Davids
  {lat: 51.85, lon: -5.10},    // Milford Haven
  {lat: 51.65, lon: -5.00},    // Pembroke
  {lat: 51.55, lon: -4.90},    // Carmarthen Bay
  {lat: 51.45, lon: -4.20},    // Gower Peninsula
  {lat: 51.40, lon: -3.50},    // Swansea
  {lat: 51.30, lon: -3.00},    // Cardiff
  {lat: 51.35, lon: -2.80},    // Newport
  {lat: 51.40, lon: -2.70},    // Severn Estuary (English border)
  // Include a simplified land border with England
  {lat: 51.80, lon: -2.60},    // Wye Valley
  {lat: 52.00, lon: -2.80},    // Herefordshire
  {lat: 52.20, lon: -2.50},    // Shropshire border
  {lat: 52.40, lon: -2.80},    // Welsh Marches
  {lat: 52.60, lon: -2.50},    // Shropshire
  {lat: 52.80, lon: -2.80},    // Montgomeryshire
  {lat: 52.95, lon: -3.00},    // Denbighshire
  {lat: 53.10, lon: -3.00},    // Flintshire
  {lat: 53.20, lon: -3.00},    // North border
  {lat: 53.35, lon: -3.00}     // Close at Dee Estuary
];

// ENGLAND - West Coast only (from Scottish border to Cornwall, simplified, 32 points)
export const ENGLAND_WEST_COAST = [
  {lat: 55.80, lon: -2.00},    // Scottish border - Berwick
  {lat: 55.70, lon: -2.30},    // Northumberland coast
  {lat: 55.50, lon: -2.80},    // Bamburgh
  {lat: 55.20, lon: -3.00},    // Farne Islands
  {lat: 54.80, lon: -3.20},    // Solway Firth
  {lat: 54.40, lon: -3.60},    // Cumbria coast
  {lat: 54.10, lon: -3.20},    // Morecambe Bay
  {lat: 53.90, lon: -3.00},    // Blackpool
  {lat: 53.70, lon: -3.00},    // Merseyside
  {lat: 53.50, lon: -3.10},    // Liverpool Bay
  {lat: 53.30, lon: -3.00},    // Dee Estuary (Wales border)
  // The coast continues as Wales - skip to Welsh/English border south
  {lat: 51.40, lon: -2.70},    // Severn Estuary (Wales border)
  {lat: 51.30, lon: -2.60},    // Avonmouth
  {lat: 51.20, lon: -3.00},    // Somerset coast
  {lat: 51.10, lon: -3.10},    // Bridgwater Bay
  {lat: 51.00, lon: -3.30},    // Minehead
  {lat: 50.90, lon: -3.50},    // North Devon
  {lat: 50.80, lon: -4.00},    
  {lat: 50.70, lon: -4.20},    // Bideford Bay
  {lat: 50.60, lon: -4.50},    // Hartland Point
  {lat: 50.50, lon: -5.00},    // Bude
  {lat: 50.40, lon: -5.10},    // Tintagel
  {lat: 50.30, lon: -5.20},    // Padstow
  {lat: 50.20, lon: -5.50},    // Newquay
  {lat: 50.10, lon: -5.60},    // St. Ives
  {lat: 50.05, lon: -5.50},    // Land's End area
  {lat: 49.95, lon: -5.10},    // Lizard Point
  {lat: 49.90, lon: -4.80},    // Falmouth
  {lat: 49.95, lon: -4.50},    // St Austell Bay
  {lat: 50.00, lon: -4.30},    // Plymouth
  {lat: 50.20, lon: -3.80},    // South Devon
  {lat: 50.30, lon: -3.50}     // Torquay area
];

// ISLE OF MAN - Small island in the Irish Sea (simplified, 12 points)
export const ISLE_OF_MAN = [
  {lat: 54.45, lon: -4.80},    // Point of Ayre (North)
  {lat: 54.40, lon: -4.40},    // Ramsey Bay
  {lat: 54.25, lon: -4.10},    // Maughold
  {lat: 54.10, lon: -4.50},    
  {lat: 54.05, lon: -4.80},    // Douglas area
  {lat: 54.00, lon: -4.80},    
  {lat: 53.90, lon: -4.70},    // Castletown
  {lat: 53.85, lon: -4.60},    // Calf of Man
  {lat: 53.90, lon: -4.90},    // Port Erin
  {lat: 54.00, lon: -5.00},    // Peel
  {lat: 54.20, lon: -5.00},    // Kirk Michael
  {lat: 54.45, lon: -4.80}     // Close polygon
];

// Default export
export default {
  IRELAND_COAST,
  WALES_COAST,
  ENGLAND_WEST_COAST,
  ISLE_OF_MAN
};
