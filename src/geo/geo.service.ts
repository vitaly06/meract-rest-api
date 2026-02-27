import { Injectable, BadRequestException } from '@nestjs/common';

// https://countriesnow.space — бесплатно, без ключа
const COUNTRIES_NOW_BASE = 'https://countriesnow.space/api/v0.1';

@Injectable()
export class GeoService {
  async searchCountries(query: string) {
    if (!query || query.trim().length < 1) {
      return { countries: [] };
    }

    const res = await fetch(`${COUNTRIES_NOW_BASE}/countries`);
    if (!res.ok) {
      throw new BadRequestException('Failed to fetch countries');
    }

    const json = (await res.json()) as {
      data: { country: string; cities: string[] }[];
    };

    const term = query.trim().toLowerCase();
    const matched = json.data
      .map((d) => d.country)
      .filter((name) => name.toLowerCase().includes(term))
      .slice(0, 20);

    return { countries: matched };
  }

  async searchCities(country: string, query: string) {
    if (!country) {
      throw new BadRequestException('Country is required');
    }
    if (!query || query.trim().length < 1) {
      return { cities: [] };
    }

    const res = await fetch(`${COUNTRIES_NOW_BASE}/countries/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });

    if (!res.ok) {
      throw new BadRequestException('Failed to fetch cities');
    }

    const json = (await res.json()) as { data: string[]; error: boolean };

    if (json.error) {
      throw new BadRequestException('Country not found');
    }

    const term = query.trim().toLowerCase();
    const matched = json.data
      .filter((city) => city.toLowerCase().includes(term))
      .slice(0, 20);

    return { cities: matched };
  }
}
