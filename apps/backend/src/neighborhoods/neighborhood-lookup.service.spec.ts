import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { NeighborhoodLookupService } from './neighborhood-lookup.service';

// Real shapefile — present in the repo at data/neighborhoods/
const SHAPEFILE_DIR = path.join(process.cwd(), 'data', 'neighborhoods');
const SHAPEFILE_PRESENT = fs.existsSync(path.join(SHAPEFILE_DIR, 'Neighborhoods.shp'));

function buildService(dir?: string): NeighborhoodLookupService {
  const svc = new NeighborhoodLookupService();
  if (dir !== undefined) process.env['NEIGHBORHOODS_DIR'] = dir;
  svc.onModuleInit();
  if (dir !== undefined) delete process.env['NEIGHBORHOODS_DIR'];
  return svc;
}

describe('NeighborhoodLookupService', () => {
  describe('when shapefile is missing', () => {
    it('disables lookup gracefully and returns null', () => {
      const emptyDir = os.tmpdir();
      const svc = buildService(emptyDir);
      expect(svc.lookup(-10046885, 4666741)).toBeNull();
    });
  });

  (SHAPEFILE_PRESENT ? describe : describe.skip)(
    'with real shapefile',
    () => {
      let svc: NeighborhoodLookupService;

      beforeAll(() => {
        svc = buildService(SHAPEFILE_DIR);
      });

      it('loads 88 neighborhood polygons', () => {
        // St. Louis has 88 official neighborhoods
        expect((svc as unknown as { polygons: unknown[] }).polygons).toHaveLength(88);
      });

      it('identifies neighborhood 27 (Shaw) from known coordinates', () => {
        // srx/sry sourced from real DB records in neighborhood 27
        expect(svc.lookup(-10046885.432, 4666741.092)).toBe('27');
      });

      it('identifies neighborhood 35 (Downtown) from known coordinates', () => {
        expect(svc.lookup(-10039593.481, 4668691.475)).toBe('35');
      });

      it('identifies neighborhood 65 (Penrose) from known coordinates', () => {
        expect(svc.lookup(-10041634.692, 4674045.172)).toBe('65');
      });

      it('identifies neighborhood 46 (Baden) from known coordinates', () => {
        expect(svc.lookup(-10051860.106, 4672236.481)).toBe('46');
      });

      it('returns null for coordinates outside the city', () => {
        // Web Mercator origin (0, 0) is in the Gulf of Guinea
        expect(svc.lookup(0, 0)).toBeNull();
      });
    },
  );

  describe('parseDbf()', () => {
    it('parses neighborhood number and name fields', () => {
      if (!SHAPEFILE_PRESENT) return;
      const svc = new NeighborhoodLookupService();
      const buf = fs.readFileSync(path.join(SHAPEFILE_DIR, 'Neighborhoods.dbf'));
      const records = svc.parseDbf(buf);
      expect(records.length).toBe(88);
      expect(records[0]).toHaveProperty('NHD_NUM');
      expect(records[0]).toHaveProperty('NHD_NAME');
    });
  });

  describe('parseShp()', () => {
    it('parses 88 polygon geometries', () => {
      if (!SHAPEFILE_PRESENT) return;
      const svc = new NeighborhoodLookupService();
      const buf = fs.readFileSync(path.join(SHAPEFILE_DIR, 'Neighborhoods.shp'));
      const geometries = svc.parseShp(buf);
      expect(geometries.length).toBe(88);
      // Each geometry has at least one ring with multiple coordinate pairs
      for (const rings of geometries) {
        expect(rings.length).toBeGreaterThanOrEqual(1);
        expect(rings[0].length).toBeGreaterThan(2);
      }
    });
  });
});
