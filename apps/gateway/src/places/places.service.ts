import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  PlaceDetails, PlaceCommunityNote, PlaceNoteAgree,
  TripStop, Trip, Job,
} from '@app/database';

const PRICE_LABELS: Record<number, string> = {
  0: 'Free',
  1: 'Inexpensive',
  2: 'Moderate',
  3: 'Expensive',
  4: 'Very expensive',
};

function todayHours(weekdayText: string[] | null | undefined): string | null {
  if (!weekdayText?.length) return null;
  const dayIndex = new Date().getDay(); // 0 = Sunday
  // Google weekday_text: index 0 = Monday … 6 = Sunday
  const googleIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  return weekdayText[googleIndex] ?? null;
}

function formatPlaceDetails(d: PlaceDetails) {
  const hours = d.openingHours
    ? {
        openNow:      d.openingHours.openNow,
        weekdayText:  d.openingHours.weekdayText,
        todayHours:   todayHours(d.openingHours.weekdayText),
      }
    : null;

  return {
    googlePlaceId:    d.googlePlaceId,
    name:             d.name,
    placeType:        d.placeType,
    allTypes:         d.allTypes,
    rating:           d.rating,
    userRatingsTotal: d.userRatingsTotal,
    formattedAddress: d.formattedAddress,
    vicinity:         d.vicinity,
    phoneNumber:      d.phoneNumber,
    website:          d.website,
    googleMapsUrl:    d.googleMapsUrl,
    priceLevel:       d.priceLevel,
    priceLevelLabel:  d.priceLevel != null ? (PRICE_LABELS[d.priceLevel] ?? null) : null,
    latitude:         d.latitude,
    longitude:        d.longitude,
    editorialSummary: d.editorialSummary,
    openingHours:     hours,
    photos:           (d.photos ?? []).map(p => ({
      photoReference: p.photoReference,
      width:          p.width,
      height:         p.height,
      cachedUrl:      p.cachedUrl,
    })),
    primaryPhotoUrl:  d.primaryPhotoUrl,
    lastFetchedAt:    d.lastFetchedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(PlaceDetails)
    private readonly placeDetailsRepo: Repository<PlaceDetails>,
    @InjectRepository(PlaceCommunityNote)
    private readonly noteRepo: Repository<PlaceCommunityNote>,
    @InjectRepository(PlaceNoteAgree)
    private readonly agreeRepo: Repository<PlaceNoteAgree>,
    @InjectRepository(TripStop)
    private readonly stopRepo: Repository<TripStop>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  async getPlaceDetails(googlePlaceId: string) {
    const d = await this.placeDetailsRepo.findOne({ where: { googlePlaceId } });
    if (!d) throw new NotFoundException('Place details not found');
    return formatPlaceDetails(d);
  }

  async getPlaceWithContext(googlePlaceId: string, userId: string, tripStopId?: string) {
    const d = await this.placeDetailsRepo.findOne({ where: { googlePlaceId } });
    if (!d) throw new NotFoundException('Place details not found');

    const [communityNotes, sources] = await Promise.all([
      this.getCommunityNotes(googlePlaceId, userId),
      this.getPlaceSources(googlePlaceId),
    ]);

    let privateNote: string | null = null;
    if (tripStopId) {
      const stop = await this.stopRepo.findOne({ where: { id: tripStopId } });
      privateNote = stop?.privateNote ?? null;
    }

    const userNoteId = communityNotes.find(n => n.userId === userId)?.id ?? null;

    return {
      ...formatPlaceDetails(d),
      communityNotes,
      privateNote,
      sources,
      userNoteId,
    };
  }

  async getCommunityNotes(googlePlaceId: string, userId: string) {
    const notes = await this.noteRepo.find({
      where: { googlePlaceId, isHidden: false },
      order: { agreeCount: 'DESC' },
      take:  20,
    });

    if (!notes.length) return [];

    const agreeMap = await this.agreeRepo.find({
      where: { noteId: In(notes.map(n => n.id)), userId },
    });
    const agreedIds = new Set(agreeMap.map(a => a.noteId));

    return notes.map(n => ({
      id:         n.id,
      note:       n.note,
      agreeCount: n.agreeCount,
      hasAgreed:  agreedIds.has(n.id),
      isOwn:      n.userId === userId,
      userId:     n.userId,
      createdAt:  n.createdAt.toISOString(),
    }));
  }

  async getPlaceSources(googlePlaceId: string) {
    const stops  = await this.stopRepo.find({ where: { googlePlaceId } });
    const jobIds = [...new Set(stops.map(s => s.sourceJobId).filter(Boolean))];
    if (!jobIds.length) return { count: 0, items: [] };

    const jobs = await this.jobRepo.find({
      where:  { id: In(jobIds) },
      select: ['id', 'caption', 'creator', 'platform', 'url'],
    });

    return {
      count: jobs.length,
      items: jobs.slice(0, 10).map(j => ({
        jobId:    j.id,
        caption:  j.caption,
        creator:  j.creator,
        platform: j.platform,
        url:      j.url,
      })),
    };
  }

  async addCommunityNote(googlePlaceId: string, userId: string, note: string) {
    const trimmed = note.trim();

    // URL check
    if (/https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('URLs are not allowed in community notes');
    }
    // Phone number check
    if (/(\+?\d[\s\-.]?){9,}/.test(trimmed)) {
      throw new BadRequestException('Phone numbers are not allowed in community notes');
    }

    // Max 3 notes per user per place
    const existing = await this.noteRepo.find({ where: { googlePlaceId, userId } });
    if (existing.length >= 3) {
      throw new BadRequestException('Maximum 3 notes per place');
    }

    // Rough duplicate check (same text from same user)
    const dup = existing.find(n => n.note.toLowerCase() === trimmed.toLowerCase());
    if (dup) throw new ConflictException('You already added this note');

    return this.noteRepo.save({ googlePlaceId, userId, note: trimmed, isPublic: true });
  }

  async deleteCommunityNote(googlePlaceId: string, noteId: string, userId: string) {
    const note = await this.noteRepo.findOne({ where: { id: noteId, googlePlaceId } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId) throw new ForbiddenException('Not your note');
    await this.noteRepo.delete({ id: noteId });
  }

  async agreeWithNote(noteId: string, userId: string) {
    const existing = await this.agreeRepo.findOne({ where: { noteId, userId } });
    if (existing) {
      await this.agreeRepo.delete({ noteId, userId });
      await this.noteRepo.decrement({ id: noteId }, 'agreeCount', 1);
      const updated = await this.noteRepo.findOne({ where: { id: noteId } });
      return { agreed: false, agreeCount: updated?.agreeCount ?? 0 };
    } else {
      await this.agreeRepo.save({ noteId, userId });
      await this.noteRepo.increment({ id: noteId }, 'agreeCount', 1);
      const updated = await this.noteRepo.findOne({ where: { id: noteId } });
      return { agreed: true, agreeCount: updated?.agreeCount ?? 1 };
    }
  }

  async updatePrivateNote(tripId: string, stopId: string, userId: string, note: string) {
    const trip = await this.tripRepo.findOne({ where: { id: tripId, userId } });
    if (!trip) throw new ForbiddenException('Trip not found or not yours');
    const stop = await this.stopRepo.findOne({ where: { id: stopId, tripId } });
    if (!stop) throw new NotFoundException('Stop not found');
    await this.stopRepo.update({ id: stopId }, { privateNote: note });
    return { updated: true };
  }

  async refreshPlaceDetails(googlePlaceId: string) {
    await this.placeDetailsRepo.update({ googlePlaceId }, { lastFetchedAt: new Date(0) });
    return { refreshing: true };
  }
}
