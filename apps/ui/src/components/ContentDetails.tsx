// apps/ui/src/components/ContentDetail.tsx
import React from 'react';
import type { ContentItem } from '../types';

export default function ContentDetail({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const conf = Math.round((item.travelConfidence ?? 0) * 100);

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:'var(--radius-lg)', padding:22, width:'90%', maxWidth:500, maxHeight:'80vh', overflowY:'auto' }}
      >
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <p style={{ fontWeight:500, fontSize:14, lineHeight:1.4, marginBottom:5 }}>{item.caption ?? item.url}</p>
            <div style={{ fontSize:12, color:'var(--text-2)' }}>{item.creator ?? 'Unknown'} · {item.platform} · {item.country ?? 'Unknown country'}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'0.5px solid var(--border)', borderRadius:'var(--radius-md)', width:28, height:28, cursor:'pointer', fontSize:14, color:'var(--text-2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
        </div>

        {item.description && (
          <Section label="Description">
            <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>{item.description}</p>
          </Section>
        )}

        {item.summary && (
          <Section label="AI summary">
            <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, fontStyle:'italic', background:'var(--bg)', padding:'10px 12px', borderRadius:'var(--radius-md)' }}>"{item.summary}"</p>
          </Section>
        )}

        {item.entities?.length > 0 && (
          <Section label="Entities">
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {item.entities.map(e => (
                <span key={e} style={{ fontSize:11, background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:20, padding:'2px 9px', color:'var(--text-2)' }}>{e}</span>
              ))}
            </div>
          </Section>
        )}

        <Section label="Travel confidence">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, height:5, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${conf}%`, background:'#639922', borderRadius:3 }} />
            </div>
            <span style={{ fontSize:12, fontWeight:500, color:'#3B6D11' }}>{conf}%</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop:14, paddingTop:14, borderTop:'0.5px solid var(--border)' }}>
      <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:7 }}>{label}</div>
      {children}
    </div>
  );
}