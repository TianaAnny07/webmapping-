import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('zones')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get('classement')
  getClassement(@Query('region') region?: string, @Query('statut') statut?: string) {
    return this.zonesService.getClassement({ region, statut });
  }

  @Get('classement/regions/geojson')
  getRegionGeoJson() {
    return this.zonesService.getRegionGeoJson();
  }
}