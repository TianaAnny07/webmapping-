import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { kMeansPondere, Point } from './recommandation.utils';

export interface RecommandationResult {
  id: number;
  lat: number;
  lng: number;
  statut: string;
  populationCouverte: number;
  pourcentageCouverture: number;
  communePlusProche: string;
  communesCouvertes: string[];
  distancePlusProcheKm: number | null;
  populationRayon3km: number;
  typeEtablissementRecommande: string;
  texte: string;
}

@Injectable()
export class RecommandationService {
  constructor(private readonly dataSource: DataSource) {}

  async getRecommandations(regionName: string, k: number): Promise<RecommandationResult[]> {
    const sql = `
      SELECT
        TRIM(cp.adm3_en) AS commune_name,
        COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0) AS population,
        ST_Y(ST_Centroid(cp.geom)) AS lat,
        ST_X(ST_Centroid(cp.geom)) AS lng
      FROM communes_population cp
      WHERE TRIM(cp.adm1_en) = $1
        AND cp.geom IS NOT NULL
        AND cp.adm3_en IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM zones_couverture_5km z
          WHERE ST_Intersects(cp.geom::geography, z.geom::geography)
        )
    `;

    const rows: Array<{ commune_name: string; population: string; lat: string; lng: string }> =
      await this.dataSource.query(sql, [regionName]);

    if (rows.length === 0) return [];

    const points: Point[] = rows.map((r) => ({
      communeName: r.commune_name,
      population: Number(r.population) || 0,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
    }));

    const totalPopNonCouverte = points.reduce((s, p) => s + p.population, 0);
    if (totalPopNonCouverte === 0) return [];

    const clusters = kMeansPondere(points, Math.min(k, points.length));
    const recommandations: RecommandationResult[] = [];

    for (let idx = 0; idx < clusters.length; idx++) {
      const cl = clusters[idx];
      const pourcentage = Math.round((cl.totalPopulation / totalPopNonCouverte) * 100);
      const communePlusProche = [...cl.points].sort(
        (a, b) => this.distanceApprox(a, cl.centroid) - this.distanceApprox(b, cl.centroid),
      )[0];
      const communesCouvertes = cl.points.map((p) => p.communeName);

      // Distance réelle au centre de santé existant le plus proche du centroïde recommandé
      const distanceRow = await this.dataSource.query(
        `
        SELECT ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          f.geom::geography
        ) / 1000.0 AS distance_km
        FROM facilities f
        WHERE f.geom IS NOT NULL
        ORDER BY ST_SetSRID(ST_MakePoint($1, $2), 4326) <-> f.geom
        LIMIT 1
        `,
        [cl.centroid.lng, cl.centroid.lat],
      );
      const distancePlusProcheKm = distanceRow[0]
        ? Math.round(parseFloat(distanceRow[0].distance_km) * 10) / 10
        : null;

      // Population estimée dans un rayon de 3 km autour du point recommandé
      const populationRayon3km = await this.getPopulationDansRayon(
        cl.centroid.lat,
        cl.centroid.lng,
        3,
      );
      const typeEtablissementRecommande = this.getTypeEtablissementRecommande(populationRayon3km);

      recommandations.push({
        id: idx + 1,
        lat: cl.centroid.lat,
        lng: cl.centroid.lng,
        statut: 'Critique',
        populationCouverte: cl.totalPopulation,
        pourcentageCouverture: pourcentage,
        communePlusProche: communePlusProche.communeName,
        communesCouvertes,
        distancePlusProcheKm,
        populationRayon3km,
        typeEtablissementRecommande,
        texte: `Construire un établissement ici couvrirait environ ${pourcentage}% de la population non desservie de cette zone (≈ ${cl.totalPopulation.toLocaleString('fr-FR')} habitants), proche de ${communePlusProche.communeName}.`,
      });
    }

    return recommandations;
  }

  private distanceApprox(p: { lat: number; lng: number }, c: { lat: number; lng: number }) {
    return Math.hypot(p.lat - c.lat, p.lng - c.lng);
  }

  // Population estimée dans un rayon donné (km) autour d'un point, en
  // pondérant chaque commune par la proportion de sa surface incluse dans
  // le buffer (plus précis qu'une simple intersection binaire).
  private async getPopulationDansRayon(
    lat: number,
    lng: number,
    rayonKm: number,
  ): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(
        COALESCE(cp.mdg_admpop_adm3_2018_t_tl, 0) *
        (ST_Area(ST_Intersection(cp.geom::geography, buffer.geom)::geography) / NULLIF(ST_Area(cp.geom::geography), 0))
      ), 0) AS population_estimee
      FROM communes_population cp,
      (SELECT ST_Buffer(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3
      ) AS geom) AS buffer
      WHERE ST_Intersects(cp.geom::geography, buffer.geom)
    `;
    const result = await this.dataSource.query(sql, [lng, lat, rayonKm * 1000]);
    return Math.round(Number(result[0]?.population_estimee) || 0);
  }


  private getTypeEtablissementRecommande(populationRayon: number): string {
    if (populationRayon < 5000) return 'Poste de santé / CSB I';
    if (populationRayon < 15000) return 'CSB I';
    return 'CSB II';
  }
}