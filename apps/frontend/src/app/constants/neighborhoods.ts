/**
 * Official City of St. Louis neighborhood number → name mapping.
 * Source: Planning and Urban Design Agency / MARIS citywide neighborhood map.
 * Numbers correspond to the `neighborhood` field in the CSB database.
 */
export const NEIGHBORHOOD_NAMES: Record<number, string> = {
  1:  'Carondelet',
  2:  'Patch',
  3:  'Holly Hills',
  4:  'Boulevard Heights',
  5:  'Bevo Mill',
  6:  'Princeton Heights',
  7:  'Southampton',
  8:  'St. Louis Hills',
  9:  'Lindenwood Park',
  10: 'Ellendale',
  11: 'Clifton Heights',
  12: 'The Hill',
  13: 'Southwest Garden',
  14: 'Northampton',
  15: 'Tower Grove South',
  16: 'Dutchtown',
  17: 'Mount Pleasant',
  18: 'Marine Villa',
  19: 'Gravois Park',
  20: 'Kosciusko',
  21: 'Soulard',
  22: 'Benton Park',
  23: 'McKinley Heights',
  24: 'Fox Park',
  25: 'Tower Grove East',
  26: 'Compton Heights',
  27: 'Shaw',
  28: 'Botanical Heights',
  29: 'Tiffany',
  30: 'Benton Park West',
  31: 'The Gate District',
  32: 'Lafayette Square',
  33: 'Peabody Darst Webbe',
  34: 'LaSalle Park',
  35: 'Downtown',
  36: 'Downtown West',
  37: 'Midtown',
  38: 'Central West End',
  39: 'Forest Park Southeast',
  40: 'Kings Oak',
  41: 'Cheltenham',
  42: 'Clayton-Tamm',
  43: 'Franz Park',
  44: 'Hi-Pointe',
  45: 'Wydown-Skinker',
  46: 'Skinker-DeBaliviere',
  47: 'DeBaliviere Place',
  48: 'West End',
  49: 'Visitation Park',
  50: 'Wells-Goodfellow',
  51: 'Academy',
  52: 'Kingsway West',
  53: 'Fountain Park',
  54: 'Lewis Place',
  55: 'Kingsway East',
  56: 'Greater Ville',
  57: 'The Ville',
  58: 'Vandeventer',
  59: 'Jeff-Vander-Lou',
  60: 'St. Louis Place',
  61: 'Carr Square',
  62: 'Columbus Square',
  63: 'Old North St. Louis',
  64: 'Near North Riverfront',
  65: 'Hyde Park',
  66: 'College Hill',
  67: 'Fairground Neighborhood',
  68: "O'Fallon",
  69: 'Penrose',
  70: 'Mark Twain-I-70 Industrial',
  71: 'Mark Twain',
  72: 'Walnut Park East',
  73: 'North Pointe',
  74: 'Baden',
  75: 'Riverview',
  76: 'Walnut Park West',
  77: 'Covenant Blu-Grand Center',
  78: 'Hamilton Heights',
  79: 'North Riverfront',
};

/**
 * Normalizes a raw neighborhood value from the DB to a number, then returns
 * the name. Returns null for values that can't be resolved (0, '-', '.', etc.).
 */
export function neighborhoodName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, '').replace(/o$/i, '0'); // fix "56o" → "56"
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return NEIGHBORHOOD_NAMES[n] ?? null;
  }
  // Pass through values that contain letters (already a name like "St. Louis Hills")
  if (/[a-zA-Z]/.test(raw)) return raw.trim();
  // Pure punctuation/symbols — treat as noise
  return null;
}

/**
 * Returns "Name (n)" for display, or falls back to the raw value.
 */
export function neighborhoodLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  const name = neighborhoodName(raw);
  if (!name) return raw.trim();
  const n = parseInt(raw.trim(), 10);
  return isNaN(n) ? name : `${name} (${n})`;
}
