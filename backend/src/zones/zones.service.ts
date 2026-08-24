import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface ZoneRow {
  district: string;
  region: string;
  nb_etablissements: number;
  nb_24h: number;
  total_population: number;
  covered_population: number;
  coverage_percent: number;
  avg_distance_km: number;
}

interface ClassementFilters {
  region?: string;
  statut?: string;
}


const DETOUR_FACTOR = 1.3; 
const CAR_SPEED_KMH = 40;
const WALK_SPEED_KMH = 4.5;


function computeStatut(coveragePercent: number): string {
  if (coveragePercent < 25) return 'Critique';
  if (coveragePercent < 50) return 'Prioritaire';
  return 'Couvert';
}

function computeTravelMinutes(avgDistanceKm: number) {
  const avgCarMin = avgDistanceKm > 0
    ? Math.round(((avgDistanceKm * DETOUR_FACTOR) / CAR_SPEED_KMH) * 60)
    : 0;
  const avgWalkMin = avgDistanceKm > 0
    ? Math.round(((avgDistanceKm * DETOUR_FACTOR) / WALK_SPEED_KMH) * 60)
    : 0;
  return { avgCarMin, avgWalkMin };
}

@Injectable()
export class ZonesService {
  constructor(private readonly dataSource: DataSource) {}

  async getClassement(filters: ClassementFilters) {
    const sql = `
      WITH district_stats AS (
        SELECT
          adm2_name AS district,
          adm1_name AS region,
          COUNT(*) AS nb_etablissements,
          COUNT(*) FILTER (WHERE is_24h = true) AS nb_24h
        FROM facilities
        WHERE adm2_name IS NOT NULL AND adm1_name IS NOT NULL
        GROUP BY adm2_name, adm1_name
      ),
      population_coverage AS (
        SELECT
          TRIM(cp.adm2_en) AS district,
          TRIM(cp.adm1_en) AS region,
          SUM(COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0)) AS total_population,
          SUM(
            CASE
              WHEN cp.geom IS NOT NULL AND EXISTS (
                SELECT 1
                FROM zones_couverture_5km z
                WHERE ST_Intersects(cp.geom::geography, z.geom::geography)
              ) THEN COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0)
              ELSE 0
            END
          ) AS covered_population
        FROM communes_population cp
        WHERE cp.adm2_en IS NOT NULL AND cp.adm1_en IS NOT NULL
        GROUP BY TRIM(cp.adm2_en), TRIM(cp.adm1_en)
      ),
      commune_distances AS (
        SELECT
          TRIM(cp.adm2_en) AS district,
          TRIM(cp.adm1_en) AS region,
          COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0) AS population,
          ST_Distance(cp.geom::geography, nearest.geom::geography) / 1000.0 AS nearest_facility_km
        FROM communes_population cp
        CROSS JOIN LATERAL (
          SELECT f.geom
          FROM facilities f
          WHERE f.geom IS NOT NULL
          ORDER BY cp.geom <-> f.geom
          LIMIT 1
        ) AS nearest
        WHERE cp.geom IS NOT NULL AND cp.adm2_en IS NOT NULL AND cp.adm1_en IS NOT NULL
      ),
      district_distance AS (
        SELECT
          district,
          region,
          CASE
            WHEN SUM(population) > 0
              THEN SUM(nearest_facility_km * population) / SUM(population)
            ELSE AVG(nearest_facility_km)
          END AS avg_distance_km
        FROM commune_distances
        GROUP BY district, region
      )
      SELECT
        ds.district,
        ds.region,
        ds.nb_etablissements,
        ds.nb_24h,
        COALESCE(pc.total_population, 0) AS total_population,
        COALESCE(pc.covered_population, 0) AS covered_population,
        CASE
          WHEN COALESCE(pc.total_population, 0) > 0
            THEN ROUND((COALESCE(pc.covered_population, 0)::numeric / pc.total_population) * 100)
          ELSE 0
        END AS coverage_percent,
        COALESCE(dd.avg_distance_km, 0) AS avg_distance_km
      FROM district_stats ds
      LEFT JOIN population_coverage pc
        ON LOWER(pc.district) = LOWER(TRIM(ds.district))
        AND LOWER(pc.region) = LOWER(TRIM(ds.region))
      LEFT JOIN district_distance dd
        ON LOWER(dd.district) = LOWER(TRIM(ds.district))
        AND LOWER(dd.region) = LOWER(TRIM(ds.region))
      ORDER BY coverage_percent ASC
    `;

    const raw: ZoneRow[] = await this.dataSource.query(sql);

    const rows = raw.map((r) => {
      const totalPopulation = Number(r.total_population) || 0;
      const coveredPopulation = Number(r.covered_population) || 0;
      const coveragePercent = Math.min(100, Math.max(0, Number(r.coverage_percent) || 0));

      // Statut basé directement sur la couverture population réelle,
      // plus simple à justifier qu'un score composite à poids arbitraires.
      const statut = computeStatut(coveragePercent);

      const avgDistanceKm = Number(r.avg_distance_km) || 0;
      const { avgCarMin, avgWalkMin } = computeTravelMinutes(avgDistanceKm);

      return {
        district: r.district,
        region: r.region,
        avgCarMin,
        avgWalkMin,
        avgDistanceKm: Math.round(avgDistanceKm * 10) / 10,
        coveragePercent,
        totalPopulation,
        coveredPopulation,
        uncoveredPopulation: Math.max(0, totalPopulation - coveredPopulation),
        nbEtablissements: Number(r.nb_etablissements) || 0,
        nb24h: Number(r.nb_24h) || 0,
        statut,
      };
    });

    let filtered = rows;
    if (filters.region) {
      filtered = filtered.filter((r) => r.region === filters.region);
    }
    if (filters.statut) {
      filtered = filtered.filter((r) => r.statut === filters.statut);
    }

    const regions = [...new Set(rows.map((r) => r.region))].sort();
    const statuts = [...new Set(rows.map((r) => r.statut))].sort();

    return {
      data: filtered,
      meta: {
        total: filtered.length,
        regions,
        statuts,
        sortedBy: 'coveragePercent',
        order: 'asc',
      },
    };
  }

  /**
   * Renvoie un FeatureCollection GeoJSON : un polygone par région (adm1),
   * fusion des communes qui la composent, avec les stats de couverture
   * agrégées au niveau région. Utilisé pour colorer la carte par statut.
   */
  async getRegionGeoJson() {
    const sql = `
      WITH region_stats AS (
        SELECT
          adm1_name AS region,
          COUNT(*) AS nb_etablissements,
          COUNT(*) FILTER (WHERE is_24h = true) AS nb_24h
        FROM facilities
        WHERE adm1_name IS NOT NULL
        GROUP BY adm1_name
      ),
      population_coverage_region AS (
        SELECT
          TRIM(cp.adm1_en) AS region,
          SUM(COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0)) AS total_population,
          SUM(
            CASE
              WHEN cp.geom IS NOT NULL AND EXISTS (
                SELECT 1
                FROM zones_couverture_5km z
                WHERE ST_Intersects(cp.geom::geography, z.geom::geography)
              ) THEN COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0)
              ELSE 0
            END
          ) AS covered_population
        FROM communes_population cp
        WHERE cp.adm1_en IS NOT NULL
        GROUP BY TRIM(cp.adm1_en)
      ),
      commune_distances_region AS (
        SELECT
          TRIM(cp.adm1_en) AS region,
          COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0) AS population,
          ST_Distance(cp.geom::geography, nearest.geom::geography) / 1000.0 AS nearest_facility_km
        FROM communes_population cp
        CROSS JOIN LATERAL (
          SELECT f.geom
          FROM facilities f
          WHERE f.geom IS NOT NULL
          ORDER BY cp.geom <-> f.geom
          LIMIT 1
        ) AS nearest
        WHERE cp.geom IS NOT NULL AND cp.adm1_en IS NOT NULL
      ),
      region_distance AS (
        SELECT
          region,
          CASE
            WHEN SUM(population) > 0
              THEN SUM(nearest_facility_km * population) / SUM(population)
            ELSE AVG(nearest_facility_km)
          END AS avg_distance_km
        FROM commune_distances_region
        GROUP BY region
      ),
      region_geom AS (
        SELECT
          TRIM(adm1_en) AS region,
          -- Simplification légère : polygones plus légers pour l'affichage
          -- carte, sans casser la topologie.
          ST_SimplifyPreserveTopology(ST_Union(geom), 0.001) AS geom
        FROM communes_population
        WHERE adm1_en IS NOT NULL
        GROUP BY TRIM(adm1_en)
      )
      SELECT
        rg.region,
        COALESCE(rs.nb_etablissements, 0) AS nb_etablissements,
        COALESCE(rs.nb_24h, 0) AS nb_24h,
        COALESCE(pc.total_population, 0) AS total_population,
        COALESCE(pc.covered_population, 0) AS covered_population,
        CASE
          WHEN COALESCE(pc.total_population, 0) > 0
            THEN ROUND((COALESCE(pc.covered_population, 0)::numeric / pc.total_population) * 100)
          ELSE 0
        END AS coverage_percent,
        COALESCE(rd.avg_distance_km, 0) AS avg_distance_km,
        ST_AsGeoJSON(rg.geom) AS geometry_json
      FROM region_geom rg
      LEFT JOIN region_stats rs ON LOWER(rs.region) = LOWER(rg.region)
      LEFT JOIN population_coverage_region pc ON LOWER(pc.region) = LOWER(rg.region)
      LEFT JOIN region_distance rd ON LOWER(rd.region) = LOWER(rg.region)
    `;

    const raw: Array<{
      region: string;
      nb_etablissements: number;
      nb_24h: number;
      total_population: number;
      covered_population: number;
      coverage_percent: number;
      avg_distance_km: number;
      geometry_json: string;
    }> = await this.dataSource.query(sql);

    const features = raw
      .filter((r) => r.geometry_json) // ignore les régions sans géométrie
      .map((r) => {
        const totalPopulation = Number(r.total_population) || 0;
        const coveredPopulation = Number(r.covered_population) || 0;
        const coveragePercent = Math.min(100, Math.max(0, Number(r.coverage_percent) || 0));
        const statut = computeStatut(coveragePercent);
        const avgDistanceKm = Number(r.avg_distance_km) || 0;
        const { avgCarMin, avgWalkMin } = computeTravelMinutes(avgDistanceKm);

        return {
          type: 'Feature' as const,
          geometry: JSON.parse(r.geometry_json),
          properties: {
            region: r.region,
            statut,
            coveragePercent,
            totalPopulation,
            coveredPopulation,
            uncoveredPopulation: Math.max(0, totalPopulation - coveredPopulation),
            nbEtablissements: Number(r.nb_etablissements) || 0,
            nb24h: Number(r.nb_24h) || 0,
            avgCarMin,
            avgWalkMin,
          },
        };
      });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }
}