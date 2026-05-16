import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPlaceFull, addCommunityNote, deleteCommunityNote,
  agreeWithNote, updatePrivateNote,
} from '../api';
import type { PlaceWithContext } from '../types';

export function usePlaceDetails(googlePlaceId: string | null, tripStopId?: string) {
  return useQuery<PlaceWithContext>({
    queryKey:   ['place', googlePlaceId, tripStopId],
    queryFn:    () => getPlaceFull(googlePlaceId!, tripStopId),
    enabled:    !!googlePlaceId,
    staleTime:  5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404 && failureCount < 10) return true;
      return false;
    },
    retryDelay: 3000,
  });
}

export function useAddNote(googlePlaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => addCommunityNote(googlePlaceId, note),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['place', googlePlaceId] }),
  });
}

export function useDeleteNote(googlePlaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteCommunityNote(googlePlaceId, noteId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['place', googlePlaceId] }),
  });
}

export function useAgreeNote(googlePlaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => agreeWithNote(noteId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['place', googlePlaceId] }),
  });
}

export function useUpdatePrivateNote(tripId: string, stopId: string, googlePlaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => updatePrivateNote(tripId, stopId, note),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['place', googlePlaceId] }),
  });
}
