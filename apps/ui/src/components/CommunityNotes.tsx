import React, { useState } from 'react';
import type { CommunityNote } from '../types';
import {
  useAddNote, useDeleteNote, useAgreeNote, useUpdatePrivateNote,
} from '../hooks/usePlaceDetails';

interface Props {
  googlePlaceId: string;
  tripId?:       string;
  stopId?:       string;
  notes:         CommunityNote[];
  privateNote:   string | null;
  userNoteId:    string | null;
}

export function CommunityNotes({
  googlePlaceId, tripId, stopId, notes, privateNote, userNoteId,
}: Props) {
  const [privateText, setPrivateText]     = useState(privateNote ?? '');
  const [editingPrivate, setEditingPrivate] = useState(false);
  const [newNote, setNewNote]             = useState('');
  const [showAddForm, setShowAddForm]     = useState(false);

  const addNote    = useAddNote(googlePlaceId);
  const deleteNote = useDeleteNote(googlePlaceId);
  const agreeNote  = useAgreeNote(googlePlaceId);
  const updatePrivate = useUpdatePrivateNote(tripId ?? '', stopId ?? '', googlePlaceId);

  function handlePrivateBlur() {
    if (!tripId || !stopId) return;
    updatePrivate.mutate(privateText);
    setEditingPrivate(false);
  }

  function handleAddNote() {
    if (newNote.trim().length < 10) return;
    addNote.mutate(newNote.trim(), {
      onSuccess: () => { setNewNote(''); setShowAddForm(false); },
    });
  }

  return (
    <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Private note */}
      {tripId && stopId && (
        <div style={{
          borderLeft: '3px solid #7c3aed',
          background: '#1a1529',
          borderRadius: '0 8px 8px 0',
          padding: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>🔒 MY NOTE</span>
          </div>
          {editingPrivate ? (
            <textarea
              autoFocus
              value={privateText}
              onChange={e => setPrivateText(e.target.value)}
              onBlur={handlePrivateBlur}
              rows={3}
              style={textareaStyle}
              placeholder="Add a private note only you can see..."
            />
          ) : (
            <div
              onClick={() => setEditingPrivate(true)}
              style={{ color: privateText ? '#e2e8f0' : '#4b5280', fontSize: 13, cursor: 'text', minHeight: 20 }}
            >
              {privateText || 'Add a private note only you can see...'}
            </div>
          )}
        </div>
      )}

      {/* Community notes header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          background: '#451a03', color: '#fb923c',
          fontSize: 11, fontWeight: 700, padding: '3px 10px',
          borderRadius: 20, letterSpacing: 0.5,
        }}>
          COMMUNITY NOTES
        </span>
        <span style={{ color: '#64748b', fontSize: 12 }}>{notes.length} notes</span>
      </div>

      {/* Notes list */}
      {notes.map(n => (
        <div key={n.id} style={{
          background: '#111827', borderRadius: 10,
          padding: 12, border: '1px solid #1e293b',
        }}>
          <p style={{ color: '#e2e8f0', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>
            {n.note}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>
              {n.agreeCount} {n.agreeCount === 1 ? 'traveller agrees' : 'travellers agree'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => agreeNote.mutate(n.id)}
                style={{
                  background: n.hasAgreed ? '#92400e' : 'none',
                  border: `1px solid ${n.hasAgreed ? '#f59e0b' : '#334155'}`,
                  borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                  color: n.hasAgreed ? '#fbbf24' : '#94a3b8', fontSize: 12,
                  transition: 'all 0.15s',
                }}
              >
                👍 {n.hasAgreed ? 'Agreed' : 'Agree'}
              </button>
              {n.isOwn && (
                <button
                  onClick={() => deleteNote.mutate(n.id)}
                  style={{
                    background: 'none', border: '1px solid #334155',
                    borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                    color: '#ef4444', fontSize: 12,
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add note */}
      {!userNoteId && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'none', border: '1px dashed #334155',
            borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
            color: '#64748b', fontSize: 13, textAlign: 'left',
          }}
        >
          + Add a tip for other travellers...
        </button>
      )}

      {showAddForm && (
        <div style={{ background: '#111827', borderRadius: 10, padding: 12, border: '1px solid #334155' }}>
          <textarea
            autoFocus
            value={newNote}
            onChange={e => setNewNote(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Share a tip (min 10 chars, no URLs or phone numbers)"
            style={textareaStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: '#4b5280', fontSize: 11 }}>{newNote.length}/300</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowAddForm(false); setNewNote(''); }}
                style={cancelBtn}
              >Cancel</button>
              <button
                onClick={handleAddNote}
                disabled={newNote.trim().length < 10 || addNote.isPending}
                style={submitBtn}
              >
                {addNote.isPending ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
          {addNote.isError && (
            <p style={{ color: '#f87171', fontSize: 12, margin: '6px 0 0' }}>
              {(addNote.error as any)?.response?.data?.message ?? 'Failed to post note'}
            </p>
          )}
        </div>
      )}

      {notes.length === 0 && !showAddForm && (
        <p style={{ color: '#4b5280', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          No community notes yet. Be the first!
        </p>
      )}
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%', background: '#0f172a', border: '1px solid #334155',
  borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 13,
  resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

const cancelBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #334155', borderRadius: 6,
  padding: '5px 12px', cursor: 'pointer', color: '#94a3b8', fontSize: 12,
};

const submitBtn: React.CSSProperties = {
  background: '#1d4ed8', border: 'none', borderRadius: 6,
  padding: '5px 14px', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
};
