import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TripStop } from '@app/database';

interface LinkDef {
  provider:   string;
  url:        string;
  isFeatured: boolean;
  isSponsored: boolean;
}

@Injectable()
export class AffiliateGeneratorService {
  private readonly bookingAid:  string;
  private readonly klookAid:    string;
  private readonly viatorPid:   string;
  private readonly gygPid:      string;
  private readonly skyscannerAid: string;

  constructor(private readonly config: ConfigService) {
    this.bookingAid    = this.config.get('BOOKING_COM_AFFILIATE_ID') ?? '';
    this.klookAid      = this.config.get('KLOOK_AFFILIATE_ID') ?? '';
    this.viatorPid     = this.config.get('VIATOR_PARTNER_ID') ?? '';
    this.gygPid        = this.config.get('GETYOURGUIDE_PARTNER_ID') ?? '';
    this.skyscannerAid = this.config.get('SKYSCANNER_AFFILIATE_ID') ?? '';
  }

  generateLinks(stop: TripStop, country: string): LinkDef[] {
    switch (stop.stopType) {
      case 'stay':
        return [
          { provider: 'booking_com', url: this.buildBookingUrl(stop.name, country), isFeatured: true,  isSponsored: false },
          { provider: 'agoda',       url: this.buildAgodaUrl(stop.name, country),   isFeatured: false, isSponsored: false },
          { provider: 'hotels_com',  url: this.buildHotelsUrl(stop.name, country),  isFeatured: false, isSponsored: false },
        ];
      case 'activity':
        return [
          { provider: 'klook',        url: this.buildKlookUrl(stop.name, country),  isFeatured: true,  isSponsored: false },
          { provider: 'viator',       url: this.buildViatorUrl(stop.name, country), isFeatured: false, isSponsored: false },
          { provider: 'getyourguide', url: this.buildGygUrl(stop.name, country),    isFeatured: false, isSponsored: false },
        ];
      case 'food':
        return [
          { provider: 'viator',      url: this.buildViatorFoodTourUrl(country),        isFeatured: true,  isSponsored: false },
          { provider: 'google_maps', url: this.buildGoogleMapsUrl(stop.name, country), isFeatured: false, isSponsored: false },
        ];
      case 'place':
        return [
          { provider: 'viator',      url: this.buildViatorUrl(stop.name, country),        isFeatured: true,  isSponsored: false },
          { provider: 'google_maps', url: this.buildGoogleMapsUrl(stop.name, country),    isFeatured: false, isSponsored: false },
        ];
      case 'transport':
        return [
          { provider: 'skyscanner', url: this.buildSkyscannerUrl(country), isFeatured: true, isSponsored: false },
        ];
      default:
        return [];
    }
  }

  private qs(params: Record<string, string>): string {
    return new URLSearchParams(params).toString();
  }

  private buildBookingUrl(name: string, country: string): string {
    return `https://www.booking.com/search.html?${this.qs({ ss: `${name} ${country}`, aid: this.bookingAid })}`;
  }

  private buildAgodaUrl(name: string, country: string): string {
    return `https://www.agoda.com/search?${this.qs({ city: name, country })}`;
  }

  private buildHotelsUrl(name: string, country: string): string {
    return `https://www.hotels.com/search.do?${this.qs({ q: `${name} ${country}` })}`;
  }

  private buildKlookUrl(name: string, country: string): string {
    return `https://www.klook.com/en-US/search/?${this.qs({ query: name })}&aid=${this.klookAid}`;
  }

  private buildViatorUrl(name: string, country: string): string {
    return `https://www.viator.com/searchResults/all?${this.qs({ text: `${name} ${country}`, pid: this.viatorPid })}`;
  }

  private buildViatorFoodTourUrl(country: string): string {
    return `https://www.viator.com/searchResults/all?${this.qs({ text: `food tour ${country}`, pid: this.viatorPid })}`;
  }

  private buildGygUrl(name: string, country: string): string {
    return `https://www.getyourguide.com/s/?${this.qs({ q: `${name} ${country}`, partner_id: this.gygPid })}`;
  }

  private buildSkyscannerUrl(country: string): string {
    return `https://www.skyscanner.net/flights?affiliateId=${this.skyscannerAid}`;
  }

  private buildGoogleMapsUrl(name: string, country: string): string {
    return `https://maps.google.com/?q=${encodeURIComponent(`${name} ${country}`)}`;
  }
}
