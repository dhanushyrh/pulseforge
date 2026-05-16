// apps/ui/src/components/CreatorAvatar.tsx
import React, { useState } from 'react';

const AVATAR_COLORS = [
  { bg: '#EEEDFE', color: '#3C3489' },
  { bg: '#E1F5EE', color: '#085041' },
  { bg: '#FAECE7', color: '#712B13' },
  { bg: '#FAEEDA', color: '#633806' },
  { bg: '#E6F1FB', color: '#0C447C' },
];

interface CreatorAvatarProps {
  avatarUrl?: string | null;
  handle:     string;
  size?:      number;
}

export default function CreatorAvatar({
  avatarUrl,
  handle,
  size = 40,
}: CreatorAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials  = handle.replace('@', '').slice(0, 2).toUpperCase();
  const colorIdx  = (handle.replace('@', '').charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  const { bg, color } = AVATAR_COLORS[colorIdx];

  const circleStyle: React.CSSProperties = {
    width:        size,
    height:       size,
    borderRadius: '50%',
    flexShrink:   0,
  };

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={handle}
        style={{ ...circleStyle, objectFit: 'cover' }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div style={{
      ...circleStyle,
      background:     bg,
      color,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       size * 0.35,
      fontWeight:     700,
      fontFamily:     'var(--font-ui)',
    }}>
      {initials}
    </div>
  );
}
