import { Injectable, BadRequestException, Logger } from '@nestjs/common';

// https://countriesnow.space — бесплатно, без ключа
const COUNTRIES_NOW_BASE = 'https://countriesnow.space/api/v0.1';

// Nominatim — OpenStreetMap, бесплатно, без ключа, лимит 1 req/s
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

interface Coords {
  lat: number;
  lon: number;
}

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  /** Кэш координат в рамках жизни процесса: "city|country" → Coords | null */
  private readonly coordsCache = new Map<string, Coords | null>();
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

  /**
   * Получить координаты (lat, lon) по названию города и страны.
   * Результат кэшируется в памяти процесса.
   * Если не удалось — возвращает null.
   */
  async getCityCoordinates(
    city: string | null | undefined,
    country: string | null | undefined,
  ): Promise<Coords | null> {
    if (!city) return null;
    const key = `${city}|${country ?? ''}`;
    if (this.coordsCache.has(key)) return this.coordsCache.get(key)!;

    try {
      const params = new URLSearchParams({
        format: 'json',
        limit: '1',
        city: city,
        ...(country ? { country } : {}),
      });
      const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
        headers: { 'User-Agent': 'Meract-App/1.0' },
      });
      if (!res.ok) {
        this.coordsCache.set(key, null);
        return null;
      }
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      const coords =
        data.length > 0
          ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
          : null;
      this.coordsCache.set(key, coords);
      return coords;
    } catch (err) {
      this.logger.warn(
        `Nominatim geocoding failed for "${key}": ${err.message}`,
      );
      this.coordsCache.set(key, null);
      return null;
    }
  }

  /**
   * Расстояние между двумя точками по формуле Haversine.
   * Возвращает км, округлено до целых.
   */
  haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // радиус Земли в км
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
  }

  private toRad(deg: number) {
    return (deg * Math.PI) / 180;
  }
}
