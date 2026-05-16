import React from 'react';
import type { PlaceOpeningHours } from '../types';

interface Props {
  openingHours:    PlaceOpeningHours | null;
  formattedAddress: string | null;
  phoneNumber:     string | null;
  website:         string | null;
  googleMapsUrl:   string | null;
  priceLevel:      number | null;
  priceLevelLabel: string | null;
  latitude:        number | null;
  longitude:       number | null;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function PlaceInfoRows({
  openingHours, formattedAddress, phoneNumber, website,
  googleMapsUrl, priceLevel, priceLevelLabel, latitude, longitude,
}: Props) {
  return (
    <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Hours */}
      {openingHours && (
        <InfoRow icon="🕐">
          <span style={{ color: openingHours.openNow ? '#4ade80' : '#f87171', fontWeight: 600, fontSize: 13 }}>
            {openingHours.openNow ? 'Open' : 'Closed'}
          </span>
          {openingHours.todayHours && (
            <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>
              · {openingHours.todayHours.split(': ')[1] ?? openingHours.todayHours}
            </span>
          )}
        </InfoRow>
      )}

      {/* Address */}
      {formattedAddress && (
        <InfoRow icon="📍">
          <span style={{ color: '#cbd5e1', fontSize: 13, flex: 1 }}>{formattedAddress}</span>
          <CopyBtn text={formattedAddress} />
          {googleMapsUrl && (
            <a href={googleMapsUrl} target="_blank" rel="noreferrer" style={linkStyle}>Maps ↗</a>
          )}
        </InfoRow>
      )}

      {/* Phone */}
      {phoneNumber && (
        <InfoRow icon="📞">
          <a href={`tel:${phoneNumber}`} style={{ ...linkStyle, fontSize: 13 }}>{phoneNumber}</a>
        </InfoRow>
      )}

      {/* Website */}
      {website && (
        <InfoRow icon="🌐">
          <a href={website} target="_blank" rel="noreferrer" style={{ ...linkStyle, fontSize: 13 }}>
            {website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
          </a>
        </InfoRow>
      )}

      {/* Price level */}
      {priceLevelLabel != null && (
        <InfoRow icon="💰">
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>
            {'£'.repeat(Math.max(1, priceLevel ?? 1))} · {priceLevelLabel}
          </span>
        </InfoRow>
      )}

      {/* Coordinates */}
      {latitude != null && longitude != null && (
        <InfoRow icon="🗺️">
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
          <CopyBtn text={`${latitude}, ${longitude}`} />
        </InfoRow>
      )}
    </div>
  );
}

function InfoRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { copyToClipboard(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? '#4ade80' : '#64748b', fontSize: 11, padding: '2px 4px',
      }}
    >
      {copied ? '✓' : 'copy'}
    </button>
  );
}

const linkStyle: React.CSSProperties = {
  color: '#818cf8', textDecoration: 'none', fontSize: 12,
};
