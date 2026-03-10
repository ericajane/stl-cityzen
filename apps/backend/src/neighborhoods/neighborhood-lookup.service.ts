import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import proj4 from 'proj4';

// Missouri State Plane East (NAD83, US Survey Feet) — matches Neighborhoods.prj
const STATE_PLANE_EAST =
  '+proj=tmerc +lat_0=35.83333333333334 +lon_0=-90.5 ' +
  '+k=0.9999333333333333 +x_0=250000 +y_0=0 +datum=NAD83 +units=us-ft +no_defs';

// Web Mercator — matches srx/sry in the database
const WEB_MERCATOR =
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 ' +
  '+x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs';

interface NeighborhoodPolygon {
  code: string; // zero-padded neighborhood number, e.g. "02"
  rings: [number, number][][]; // ring coordinates in Web Mercator (EPSG:3857)
}

@Injectable()
export class NeighborhoodLookupService implements OnModuleInit {
  private readonly logger = new Logger(NeighborhoodLookupService.name);
  private polygons: NeighborhoodPolygon[] = [];
  private readonly toMercator = proj4(STATE_PLANE_EAST, WEB_MERCATOR);

  onModuleInit(): void {
    const dir =
      process.env['NEIGHBORHOODS_DIR'] ??
      path.join(process.cwd(), 'data', 'neighborhoods');
    const shpPath = path.join(dir, 'Neighborhoods.shp');
    const dbfPath = path.join(dir, 'Neighborhoods.dbf');

    if (!fs.existsSync(shpPath) || !fs.existsSync(dbfPath)) {
      this.logger.warn(
        `Shapefile not found at ${shpPath} — neighborhood lookup disabled`,
      );
      return;
    }

    this.polygons = this.load(shpPath, dbfPath);
    this.logger.log(
      `Loaded ${this.polygons.length} neighborhood polygons from shapefile`,
    );
  }

  private load(shpPath: string, dbfPath: string): NeighborhoodPolygon[] {
    const shpBuf = fs.readFileSync(shpPath);
    const dbfBuf = fs.readFileSync(dbfPath);

    const attributes = this.parseDbf(dbfBuf);
    const geometries = this.parseShp(shpBuf);

    return geometries.map((rings, i) => ({
      code: String((attributes[i] as Record<string, unknown>)['NHD_NUM'] ?? '').padStart(2, '0'),
      rings: rings.map((ring) =>
        ring.map(([x, y]) => this.toMercator.forward([x, y]) as [number, number]),
      ),
    }));
  }

  /**
   * Returns the zero-padded neighborhood code (e.g. "27") for the given
   * Web Mercator coordinates, or null if no polygon contains the point.
   */
  lookup(srx: number, sry: number): string | null {
    for (const poly of this.polygons) {
      if (this.pointInPolygon(srx, sry, poly.rings)) {
        return poly.code;
      }
    }
    return null;
  }

  /** Returns true when the point lies inside the polygon (outer ring minus holes). */
  private pointInPolygon(
    x: number,
    y: number,
    rings: [number, number][][],
  ): boolean {
    if (!this.raycast(x, y, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (this.raycast(x, y, rings[i])) return false;
    }
    return true;
  }

  /** Ray-casting point-in-ring test. */
  private raycast(x: number, y: number, ring: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Reads polygon ring coordinates from an ESRI Shapefile (.shp). */
  parseShp(buf: Buffer): [number, number][][][] {
    const geometries: [number, number][][][] = [];
    let offset = 100; // skip 100-byte file header

    while (offset + 8 <= buf.length) {
      const contentLengthWords = buf.readInt32BE(offset + 4);
      const contentStart = offset + 8;
      const contentEnd = contentStart + contentLengthWords * 2;
      const shapeType = buf.readInt32LE(contentStart);

      if (shapeType === 5) {
        // Polygon: skip shape type (4) + bounding box (32)
        let pos = contentStart + 36;
        const numParts = buf.readInt32LE(pos); pos += 4;
        const numPoints = buf.readInt32LE(pos); pos += 4;

        const parts: number[] = [];
        for (let i = 0; i < numParts; i++) {
          parts.push(buf.readInt32LE(pos)); pos += 4;
        }

        const allPoints: [number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = buf.readDoubleLE(pos); pos += 8;
          const y = buf.readDoubleLE(pos); pos += 8;
          allPoints.push([x, y]);
        }

        const rings = parts.map((start, i) => {
          const end = i < parts.length - 1 ? parts[i + 1] : numPoints;
          return allPoints.slice(start, end) as [number, number][];
        });

        geometries.push(rings);
      }

      offset = contentEnd;
    }

    return geometries;
  }

  /** Reads attribute records from an ESRI DBF file. */
  parseDbf(buf: Buffer): Record<string, string | number>[] {
    const numRecords = buf.readUInt32LE(4);
    const headerSize = buf.readUInt16LE(8);
    const recordSize = buf.readUInt16LE(10);

    const fields: { name: string; type: string; len: number }[] = [];
    let offset = 32;
    while (buf[offset] !== 0x0d && offset < headerSize) {
      const name = buf
        .slice(offset, offset + 11)
        .toString('ascii')
        .replace(/\0/g, '');
      const type = String.fromCharCode(buf[offset + 11]);
      const len = buf[offset + 16];
      fields.push({ name, type, len });
      offset += 32;
    }

    const records: Record<string, string | number>[] = [];
    for (let i = 0; i < numRecords; i++) {
      const recStart = headerSize + i * recordSize + 1; // +1 skips deletion flag
      const record: Record<string, string | number> = {};
      let fieldOffset = recStart;
      for (const f of fields) {
        const raw = buf
          .slice(fieldOffset, fieldOffset + f.len)
          .toString('ascii')
          .trim();
        record[f.name] = f.type === 'N' ? Number(raw) : raw;
        fieldOffset += f.len;
      }
      records.push(record);
    }

    return records;
  }
}
