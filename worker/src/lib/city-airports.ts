// Maps normalized city names → IATA airport codes
// Also used to resolve airport code → city name for hotel searches

interface CityEntry {
  cityName: string; // Display name
  airports: string[]; // All IATA codes serving this city
}

const CITY_MAP: Record<string, CityEntry> = {
  // Spain
  madrid: { cityName: "Madrid", airports: ["MAD"] },
  barcelona: { cityName: "Barcelona", airports: ["BCN"] },
  malaga: { cityName: "Málaga", airports: ["AGP"] },
  málaga: { cityName: "Málaga", airports: ["AGP"] },
  sevilla: { cityName: "Sevilla", airports: ["SVQ"] },
  seville: { cityName: "Sevilla", airports: ["SVQ"] },
  valencia: { cityName: "Valencia", airports: ["VLC"] },
  alicante: { cityName: "Alicante", airports: ["ALC"] },
  bilbao: { cityName: "Bilbao", airports: ["BIO"] },
  palma: { cityName: "Palma de Mallorca", airports: ["PMI"] },
  "palma de mallorca": { cityName: "Palma de Mallorca", airports: ["PMI"] },
  oviedo: { cityName: "Oviedo", airports: ["OVD"] },
  asturias: { cityName: "Asturias", airports: ["OVD"] },
  santander: { cityName: "Santander", airports: ["SDR"] },
  granada: { cityName: "Granada", airports: ["GRX"] },
  murcia: { cityName: "Murcia", airports: ["RMU"] },
  ibiza: { cityName: "Ibiza", airports: ["IBZ"] },
  menorca: { cityName: "Menorca", airports: ["MAH"] },
  "las palmas": { cityName: "Las Palmas", airports: ["LPA"] },
  "gran canaria": { cityName: "Gran Canaria", airports: ["LPA"] },
  tenerife: { cityName: "Tenerife", airports: ["TFN", "TFS"] },
  lanzarote: { cityName: "Lanzarote", airports: ["ACE"] },
  fuerteventura: { cityName: "Fuerteventura", airports: ["FUE"] },
  "la palma": { cityName: "La Palma", airports: ["SPC"] },
  vigo: { cityName: "Vigo", airports: ["VGO"] },
  santiago: { cityName: "Santiago de Compostela", airports: ["SCQ"] },
  "santiago de compostela": { cityName: "Santiago de Compostela", airports: ["SCQ"] },
  zaragoza: { cityName: "Zaragoza", airports: ["ZAZ"] },
  valladolid: { cityName: "Valladolid", airports: ["VLL"] },
  // UK & Ireland
  london: { cityName: "London", airports: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  londres: { cityName: "London", airports: ["LHR", "LGW", "STN", "LTN", "LCY"] },
  manchester: { cityName: "Manchester", airports: ["MAN"] },
  edinburgh: { cityName: "Edinburgh", airports: ["EDI"] },
  edimburgo: { cityName: "Edinburgh", airports: ["EDI"] },
  dublin: { cityName: "Dublin", airports: ["DUB"] },
  dublín: { cityName: "Dublin", airports: ["DUB"] },
  birmingham: { cityName: "Birmingham", airports: ["BHX"] },
  // France
  paris: { cityName: "Paris", airports: ["CDG", "ORY"] },
  parís: { cityName: "Paris", airports: ["CDG", "ORY"] },
  nice: { cityName: "Nice", airports: ["NCE"] },
  niza: { cityName: "Nice", airports: ["NCE"] },
  lyon: { cityName: "Lyon", airports: ["LYS"] },
  marseille: { cityName: "Marseille", airports: ["MRS"] },
  marsella: { cityName: "Marseille", airports: ["MRS"] },
  // Germany
  berlin: { cityName: "Berlin", airports: ["BER"] },
  berlín: { cityName: "Berlin", airports: ["BER"] },
  munich: { cityName: "Munich", airports: ["MUC"] },
  múnich: { cityName: "Munich", airports: ["MUC"] },
  frankfurt: { cityName: "Frankfurt", airports: ["FRA"] },
  hamburg: { cityName: "Hamburg", airports: ["HAM"] },
  hamburgo: { cityName: "Hamburg", airports: ["HAM"] },
  cologne: { cityName: "Cologne", airports: ["CGN"] },
  colonia: { cityName: "Cologne", airports: ["CGN"] },
  dusseldorf: { cityName: "Düsseldorf", airports: ["DUS"] },
  düsseldorf: { cityName: "Düsseldorf", airports: ["DUS"] },
  // Italy
  rome: { cityName: "Rome", airports: ["FCO", "CIA"] },
  roma: { cityName: "Rome", airports: ["FCO", "CIA"] },
  milan: { cityName: "Milan", airports: ["MXP", "LIN", "BGY"] },
  milán: { cityName: "Milan", airports: ["MXP", "LIN", "BGY"] },
  venice: { cityName: "Venice", airports: ["VCE", "TSF"] },
  venecia: { cityName: "Venice", airports: ["VCE", "TSF"] },
  venezia: { cityName: "Venice", airports: ["VCE", "TSF"] },
  naples: { cityName: "Naples", airports: ["NAP"] },
  napoles: { cityName: "Naples", airports: ["NAP"] },
  nápoles: { cityName: "Naples", airports: ["NAP"] },
  florence: { cityName: "Florence", airports: ["FLR"] },
  florencia: { cityName: "Florence", airports: ["FLR"] },
  firenze: { cityName: "Florence", airports: ["FLR"] },
  bologna: { cityName: "Bologna", airports: ["BLQ"] },
  bolonia: { cityName: "Bologna", airports: ["BLQ"] },
  turin: { cityName: "Turin", airports: ["TRN"] },
  turín: { cityName: "Turin", airports: ["TRN"] },
  torino: { cityName: "Turin", airports: ["TRN"] },
  catania: { cityName: "Catania", airports: ["CTA"] },
  palermo: { cityName: "Palermo", airports: ["PMO"] },
  // Netherlands
  amsterdam: { cityName: "Amsterdam", airports: ["AMS"] },
  // Belgium
  brussels: { cityName: "Brussels", airports: ["BRU"] },
  bruselas: { cityName: "Brussels", airports: ["BRU"] },
  bruxelles: { cityName: "Brussels", airports: ["BRU"] },
  // Portugal
  lisbon: { cityName: "Lisbon", airports: ["LIS"] },
  lisboa: { cityName: "Lisbon", airports: ["LIS"] },
  porto: { cityName: "Porto", airports: ["OPO"] },
  oporto: { cityName: "Porto", airports: ["OPO"] },
  faro: { cityName: "Faro", airports: ["FAO"] },
  // Greece
  athens: { cityName: "Athens", airports: ["ATH"] },
  atenas: { cityName: "Athens", airports: ["ATH"] },
  athina: { cityName: "Athens", airports: ["ATH"] },
  thessaloniki: { cityName: "Thessaloniki", airports: ["SKG"] },
  tesalónica: { cityName: "Thessaloniki", airports: ["SKG"] },
  heraklion: { cityName: "Heraklion", airports: ["HER"] },
  creta: { cityName: "Heraklion", airports: ["HER"] },
  crete: { cityName: "Heraklion", airports: ["HER"] },
  rhodes: { cityName: "Rhodes", airports: ["RHO"] },
  rodas: { cityName: "Rhodes", airports: ["RHO"] },
  santorini: { cityName: "Santorini", airports: ["JTR"] },
  mykonos: { cityName: "Mykonos", airports: ["JMK"] },
  mikonos: { cityName: "Mykonos", airports: ["JMK"] },
  corfu: { cityName: "Corfu", airports: ["CFU"] },
  corfú: { cityName: "Corfu", airports: ["CFU"] },
  // Other Europe
  zurich: { cityName: "Zurich", airports: ["ZRH"] },
  zúrich: { cityName: "Zurich", airports: ["ZRH"] },
  geneva: { cityName: "Geneva", airports: ["GVA"] },
  ginebra: { cityName: "Geneva", airports: ["GVA"] },
  vienna: { cityName: "Vienna", airports: ["VIE"] },
  viena: { cityName: "Vienna", airports: ["VIE"] },
  wien: { cityName: "Vienna", airports: ["VIE"] },
  prague: { cityName: "Prague", airports: ["PRG"] },
  praga: { cityName: "Prague", airports: ["PRG"] },
  budapest: { cityName: "Budapest", airports: ["BUD"] },
  warsaw: { cityName: "Warsaw", airports: ["WAW"] },
  varsovia: { cityName: "Warsaw", airports: ["WAW"] },
  warszawa: { cityName: "Warsaw", airports: ["WAW"] },
  stockholm: { cityName: "Stockholm", airports: ["ARN", "BMA"] },
  estocolmo: { cityName: "Stockholm", airports: ["ARN", "BMA"] },
  oslo: { cityName: "Oslo", airports: ["OSL"] },
  copenhagen: { cityName: "Copenhagen", airports: ["CPH"] },
  copenhague: { cityName: "Copenhagen", airports: ["CPH"] },
  københavn: { cityName: "Copenhagen", airports: ["CPH"] },
  helsinki: { cityName: "Helsinki", airports: ["HEL"] },
  reykjavik: { cityName: "Reykjavik", airports: ["KEF"] },
  reikiavik: { cityName: "Reykjavik", airports: ["KEF"] },
  // Americas
  "new york": { cityName: "New York", airports: ["JFK", "EWR", "LGA"] },
  "nueva york": { cityName: "New York", airports: ["JFK", "EWR", "LGA"] },
  "los angeles": { cityName: "Los Angeles", airports: ["LAX"] },
  miami: { cityName: "Miami", airports: ["MIA"] },
  toronto: { cityName: "Toronto", airports: ["YYZ"] },
  "mexico city": { cityName: "Mexico City", airports: ["MEX"] },
  "ciudad de mexico": { cityName: "Mexico City", airports: ["MEX"] },
  "ciudad de méxico": { cityName: "Mexico City", airports: ["MEX"] },
  "buenos aires": { cityName: "Buenos Aires", airports: ["EZE", "AEP"] },
  "sao paulo": { cityName: "São Paulo", airports: ["GRU", "CGH"] },
  "são paulo": { cityName: "São Paulo", airports: ["GRU", "CGH"] },
  bogota: { cityName: "Bogotá", airports: ["BOG"] },
  bogotá: { cityName: "Bogotá", airports: ["BOG"] },
  lima: { cityName: "Lima", airports: ["LIM"] },
  cancun: { cityName: "Cancún", airports: ["CUN"] },
  cancún: { cityName: "Cancún", airports: ["CUN"] },
  // Asia
  tokyo: { cityName: "Tokyo", airports: ["NRT", "HND"] },
  tokio: { cityName: "Tokyo", airports: ["NRT", "HND"] },
  osaka: { cityName: "Osaka", airports: ["KIX", "ITM"] },
  bangkok: { cityName: "Bangkok", airports: ["BKK", "DMK"] },
  singapore: { cityName: "Singapore", airports: ["SIN"] },
  singapur: { cityName: "Singapore", airports: ["SIN"] },
  "kuala lumpur": { cityName: "Kuala Lumpur", airports: ["KUL"] },
  dubai: { cityName: "Dubai", airports: ["DXB"] },
  dubái: { cityName: "Dubai", airports: ["DXB"] },
  istanbul: { cityName: "Istanbul", airports: ["IST", "SAW"] },
  estambul: { cityName: "Istanbul", airports: ["IST", "SAW"] },
  delhi: { cityName: "Delhi", airports: ["DEL"] },
  mumbai: { cityName: "Mumbai", airports: ["BOM"] },
  bombay: { cityName: "Mumbai", airports: ["BOM"] },
  "hong kong": { cityName: "Hong Kong", airports: ["HKG"] },
  seoul: { cityName: "Seoul", airports: ["ICN", "GMP"] },
  seúl: { cityName: "Seoul", airports: ["ICN", "GMP"] },
  beijing: { cityName: "Beijing", airports: ["PEK", "PKX"] },
  pekin: { cityName: "Beijing", airports: ["PEK", "PKX"] },
  pekín: { cityName: "Beijing", airports: ["PEK", "PKX"] },
  shanghai: { cityName: "Shanghai", airports: ["PVG", "SHA"] },
  shangai: { cityName: "Shanghai", airports: ["PVG", "SHA"] },
  bali: { cityName: "Bali", airports: ["DPS"] },
  // Africa
  cairo: { cityName: "Cairo", airports: ["CAI"] },
  "el cairo": { cityName: "Cairo", airports: ["CAI"] },
  "cape town": { cityName: "Cape Town", airports: ["CPT"] },
  "ciudad del cabo": { cityName: "Cape Town", airports: ["CPT"] },
  casablanca: { cityName: "Casablanca", airports: ["CMN"] },
  marrakech: { cityName: "Marrakech", airports: ["RAK"] },
  marrakesh: { cityName: "Marrakech", airports: ["RAK"] },
  // Oceania
  sydney: { cityName: "Sydney", airports: ["SYD"] },
  sídney: { cityName: "Sydney", airports: ["SYD"] },
  melbourne: { cityName: "Melbourne", airports: ["MEL"] },
};

// Reverse map: airport code → city entry
const AIRPORT_TO_CITY = new Map<string, CityEntry>();
for (const entry of Object.values(CITY_MAP)) {
  for (const code of entry.airports) {
    AIRPORT_TO_CITY.set(code, entry);
  }
}

/**
 * Resolves a user input (city name or IATA code) to an array of IATA airport codes.
 * - "London" → ["LHR", "LGW", "STN", "LTN", "LCY"]
 * - "LHR"    → ["LHR"]  (already a code, returned as-is)
 */
export function resolveToAirportCodes(input: string): string[] {
  const normalized = input.toLowerCase().trim();

  // Already an IATA code (3 uppercase letters pattern)
  if (/^[a-z]{3}$/.test(normalized)) {
    return [input.toUpperCase()];
  }

  const entry = CITY_MAP[normalized];
  if (entry) return entry.airports;

  // Partial match fallback
  for (const [key, val] of Object.entries(CITY_MAP)) {
    if (key.startsWith(normalized) || normalized.startsWith(key)) {
      return val.airports;
    }
  }

  console.warn(`[CityAirports] No se encontraron aeropuertos para: "${input}" — se omite este destino`);
  return []; // unknown input: skip to avoid API errors
}

/**
 * Returns the city display name for a given airport code.
 * - "LHR" → "London"
 * - "CDG" → "Paris"
 */
export function airportToCity(code: string): string {
  return AIRPORT_TO_CITY.get(code.toUpperCase())?.cityName ?? code;
}
