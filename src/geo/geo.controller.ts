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

  @ApiOperation({
    summary: 'Reverse geocode lat/lng to English address',
    description:
      'Converts latitude and longitude to a formatted English address string using Nominatim (OpenStreetMap). Returns null if not found.',
  })
  @ApiQuery({ name: 'lat', description: 'Latitude', required: true, type: Number })
  @ApiQuery({ name: 'lng', description: 'Longitude', required: true, type: Number })
  @Get('reverse')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      return { address: null };
    }
    const address = await this.geoService.reverseGeocode(latNum, lngNum);
    return { address };
  }
}
