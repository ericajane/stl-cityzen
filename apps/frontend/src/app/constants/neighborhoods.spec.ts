import { neighborhoodName, neighborhoodLabel, NEIGHBORHOOD_NAMES } from './neighborhoods';

describe('NEIGHBORHOOD_NAMES', () => {
  it('has entries for all 79 official neighborhoods', () => {
    expect(Object.keys(NEIGHBORHOOD_NAMES)).toHaveLength(79);
  });

  it('maps key numbers correctly', () => {
    expect(NEIGHBORHOOD_NAMES[1]).toBe('Carondelet');
    expect(NEIGHBORHOOD_NAMES[27]).toBe('Shaw');
    expect(NEIGHBORHOOD_NAMES[35]).toBe('Downtown');
    expect(NEIGHBORHOOD_NAMES[79]).toBe('North Riverfront');
  });
});

describe('neighborhoodName', () => {
  it('returns the name for a plain number string', () => {
    expect(neighborhoodName('27')).toBe('Shaw');
    expect(neighborhoodName('1')).toBe('Carondelet');
    expect(neighborhoodName('79')).toBe('North Riverfront');
  });

  it('strips leading zeros', () => {
    expect(neighborhoodName('01')).toBe('Carondelet');
    expect(neighborhoodName('07')).toBe('Southampton');
  });

  it('returns the raw value when it is already a name string', () => {
    expect(neighborhoodName('St. Louis Hills')).toBe('St. Louis Hills');
    expect(neighborhoodName('Wells-Goodfellow')).toBe('Wells-Goodfellow');
  });

  it('returns null for falsy inputs', () => {
    expect(neighborhoodName(null)).toBeNull();
    expect(neighborhoodName(undefined)).toBeNull();
    expect(neighborhoodName('')).toBeNull();
  });

  it('returns null for non-mapped numbers', () => {
    expect(neighborhoodName('0')).toBeNull();
    expect(neighborhoodName('80')).toBeNull();
    expect(neighborhoodName('999')).toBeNull();
  });

  it('returns null for noise values like "-" or "."', () => {
    expect(neighborhoodName('-')).toBeNull();
    expect(neighborhoodName('.')).toBeNull();
  });
});

describe('neighborhoodLabel', () => {
  it('returns "Name (n)" for a known number', () => {
    expect(neighborhoodLabel('27')).toBe('Shaw (27)');
    expect(neighborhoodLabel('35')).toBe('Downtown (35)');
  });

  it('strips leading zeros in the display number', () => {
    expect(neighborhoodLabel('01')).toBe('Carondelet (1)');
  });

  it('returns the raw value as-is when already a name', () => {
    expect(neighborhoodLabel('St. Louis Hills')).toBe('St. Louis Hills');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(neighborhoodLabel(null)).toBe('');
    expect(neighborhoodLabel(undefined)).toBe('');
    expect(neighborhoodLabel('')).toBe('');
  });

  it('returns the raw value for unmapped numbers', () => {
    expect(neighborhoodLabel('80')).toBe('80');
    expect(neighborhoodLabel('-')).toBe('-');
  });
});
