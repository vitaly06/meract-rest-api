import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @ApiOperation({ summary: 'Search countries by name (autocomplete)' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @Get('countries')
  async searchCountries(@Query('q') q: string) {
    return await this.geoService.searchCountries(q);
  }

  @ApiOperation({ summary: 'Search cities by country and name (autocomplete)' })
  @ApiQuery({ name: 'country', description: 'Country name', required: true })
  @ApiQuery({ name: 'q', description: 'City search query', required: true })
  @Get('cities')
  async searchCities(@Query('country') country: string, @Query('q') q: string) {
    return await this.geoService.searchCities(country, q);
  }

  @ApiOperation({
    summary: 'Активные диапазоны расстояний для ползунка локации',
    description:
      'Возвращает отсортированный список диапазонов (id, label, minKm, maxKm, order). Используется фронтендом для рендеринга ползунка.',
  })
  @Get('location-ranges')
  async getLocationRanges() {
    return this.geoService.getActiveLocationRanges();
  }
}
