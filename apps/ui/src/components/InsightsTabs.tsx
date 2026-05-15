// apps/ui/src/components/InsightsTabs.tsx
import { useQuery } from '@tanstack/react-query';
import { getInsights } from '../api';
import type { ContentItem } from '../types';
import React from 'react';


export default function InsightsTabs({
  tab, item, jobId, conf,
}: {
  tab:   string;
  item:  ContentItem;
  jobId: string;
  conf:  number;
}) {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', jobId],
    queryFn:  () => getInsights(jobId),
    enabled:  tab !== 'overview',
  });

  if (tab === 'overview') return <OverviewTab item={item} conf={conf} />;
  if (isLoading) return <Loader />;
  if (!insights)  return <Empty text="No insights available yet" />;

  if (tab === 'stays')     return <StaysTab     stays={insights.stays} />;
  if (tab === 'places')    return <PlacesTab    places={insights.places} />;
  if (tab === 'food')      return <FoodTab      food={insights.food} />;
  if (tab === 'budget')    return <BudgetTab    budget={insights.budget} currency={insights.currency} total={insights.totalBudgetPerDay} />;
  if (tab === 'itinerary') return <ItineraryTab itineraryItems={insights.itineraryItems ?? []} hasItinerary={insights.hasItinerary} />;
  return null;
}

// ── Overview ─────────────────────────────────────────────
function OverviewTab({ item, conf }: { item: ContentItem; conf: number }) {
  return (
    <div>
      <SectionLabel>AI summary</SectionLabel>
      <div style={{ background:'var(--bg)', borderRadius:'var(--radius-md)', padding:'10px 12px', fontSize:12, color:'var(--text-2)', lineHeight:1.6, fontStyle:'italic', marginBottom:14 }}>
        "{item.summary ?? 'Summary not available yet'}"
      </div>

      {item.entities?.length > 0 && (
        <>
          <SectionLabel>Topics</SectionLabel>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
            {item.entities.map(e => (
              <span key={e} style={{ fontSize:11, background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:20, padding:'2px 9px', color:'var(--text-2)' }}>{e}</span>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Travel confidence</SectionLabel>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:5, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${conf}%`, background:'#639922', borderRadius:3 }} />
        </div>
        <span style={{ fontSize:12, fontWeight:500, color:'#3B6D11' }}>{conf}%</span>
      </div>
    </div>
  );
}

// ── Stays ────────────────────────────────────────────────
function StaysTab({ stays }: { stays: any[] }) {
  if (!stays?.length) return <Empty text="No accommodations mentioned in this video" />;
  return (
    <div>
      <SectionLabel>Accommodations mentioned</SectionLabel>
      {stays.map((s, i) => (
        <ItemRow key={i}
          icon="🏨"
          iconBg="#E6F1FB"
          name={s.name}
          sub={[s.location, s.notes].filter(Boolean).join(' · ')}
          badge={s.pricePerNight}
          badgeColor="blue"
        />
      ))}
    </div>
  );
}

// ── Places ───────────────────────────────────────────────
function PlacesTab({ places }: { places: any[] }) {
  if (!places?.length) return <Empty text="No specific places mentioned in this video" />;
  return (
    <div>
      <SectionLabel>Places visited or mentioned</SectionLabel>
      {places.map((p, i) => (
        <ItemRow key={i}
          icon={p.mustVisit ? '⭐' : '📍'}
          iconBg="#EEEDFE"
          name={p.name}
          sub={[p.category, p.notes].filter(Boolean).join(' · ')}
          badge={p.mustVisit ? 'must visit' : p.category}
          badgeColor={p.mustVisit ? 'purple' : 'gray'}
        />
      ))}
    </div>
  );
}

// ── Food ─────────────────────────────────────────────────
function FoodTab({ food }: { food: any[] }) {
  if (!food?.length) return <Empty text="No food or drinks mentioned in this video" />;
  return (
    <div>
      <SectionLabel>Food &amp; drinks tried</SectionLabel>
      {food.map((f, i) => (
        <ItemRow key={i}
          icon="🍽"
          iconBg="#FAECE7"
          name={f.name}
          sub={[f.restaurant, f.rating ? `Rated ${f.rating}` : null, f.notes].filter(Boolean).join(' · ')}
          badge={f.price}
          badgeColor="coral"
        />
      ))}
    </div>
  );
}

// ── Budget ───────────────────────────────────────────────
function BudgetTab({ budget, currency, total }: { budget: any[]; currency: string | null; total: number }) {
  if (!budget?.length) return <Empty text="No budget information mentioned in this video" />;

  const maxAmt = Math.max(...budget.map(b => parseFloat(b.amount) || 0));

  return (
    <div>
      <SectionLabel>Cost breakdown from video</SectionLabel>
      {budget.map((b, i) => {
        const amt = parseFloat(b.amount) || 0;
        const pct = maxAmt > 0 ? Math.round((amt / maxAmt) * 100) : 0;
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid var(--border)' }}>
            <div>
              <div style={{ fontSize:12, color:'var(--text-2)', textTransform:'capitalize' }}>{b.category}</div>
              <div style={{ height:3, background:'var(--bg)', borderRadius:2, overflow:'hidden', marginTop:4, width:100 }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'#534AB7', borderRadius:2 }} />
              </div>
            </div>
            <div style={{ fontSize:12, fontWeight:500 }}>{b.currency} {b.amount}</div>
          </div>
        );
      })}

      {total > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:10, marginTop:4, borderTop:'0.5px solid var(--border)' }}>
          <span style={{ fontSize:12, fontWeight:500 }}>Est. total / day</span>
          <span style={{ fontSize:15, fontWeight:500, color:'#534AB7' }}>
            ~${Math.round(total)} USD
          </span>
        </div>
      )}
    </div>
  );
}

// ── Itinerary ────────────────────────────────────────────
const TYPE_CFG = {
  commute:  { icon: '✈️', bg: '#EAF3DE', color: '#27500A', label: 'Commute'  },
  stay:     { icon: '🏨', bg: '#E6F1FB', color: '#0C447C', label: 'Stay'     },
  activity: { icon: '🎯', bg: '#EEEDFE', color: '#3C3489', label: 'Activity' },
  food:     { icon: '🍽️', bg: '#FAECE7', color: '#712B13', label: 'Food'     },
} as const;

function ItineraryTab({ itineraryItems, hasItinerary }: { itineraryItems: any[]; hasItinerary: boolean }) {
  if (!hasItinerary || !itineraryItems?.length) {
    return <Empty text="No day-by-day itinerary discussed in this video" />;
  }

  const byDay = itineraryItems.reduce<Record<number, any[]>>((acc, item) => {
    const d = item.day ?? 0;
    (acc[d] ??= []).push(item);
    return acc;
  }, {});

  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <SectionLabel>Day-by-day itinerary</SectionLabel>
      {days.map(day => (
        <div key={day} style={{ marginBottom: 20 }}>
          {/* Day header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'#EEEDFE', color:'#3C3489', fontSize:10, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {day || '?'}
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text-1)' }}>Day {day || '?'}</span>
          </div>

          {/* Items */}
          {byDay[day].map((item: any, i: number) => {
            const cfg = TYPE_CFG[item.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.activity;
            return (
              <div key={i} style={{ display:'flex', gap:10, paddingLeft:32, paddingBottom:12, position:'relative' }}>
                <div style={{ position:'absolute', left:11, top:0, bottom:0, width:1, background:'var(--border)' }} />
                <div style={{ position:'absolute', left:4, top:4, width:16, height:16, borderRadius:'50%', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, flexShrink:0 }}>
                  {cfg.icon}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:cfg.bg, color:cfg.color, fontWeight:500 }}>{cfg.label}</span>
                    {item.time && <span style={{ fontSize:10, color:'var(--text-3)' }}>{item.time}</span>}
                  </div>
                  <div style={{ fontSize:12, fontWeight:500, color:'var(--text-1)', marginBottom:2 }}>{item.name}</div>
                  {item.place && (
                    <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:2 }}>
                      📍 {item.place}
                      {item.address && <span style={{ color:'var(--text-3)' }}> · {item.address}</span>}
                    </div>
                  )}
                  {item.rating && <div style={{ fontSize:10, color:'var(--text-3)' }}>⭐ {item.rating}</div>}
                  {item.notes && <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic', marginTop:2 }}>{item.notes}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Shared components ────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>
      {children}
    </div>
  );
}

function ItemRow({ icon, iconBg, name, sub, badge, badgeColor }: {
  icon: string; iconBg: string; name: string; sub: string;
  badge: string | null; badgeColor: string;
}) {
  const colors: Record<string, { bg: string; color: string }> = {
    blue:   { bg:'#E6F1FB', color:'#0C447C' },
    green:  { bg:'#EAF3DE', color:'#27500A' },
    purple: { bg:'#EEEDFE', color:'#3C3489' },
    amber:  { bg:'#FAEEDA', color:'#633806' },
    coral:  { bg:'#FAECE7', color:'#712B13' },
    gray:   { bg:'var(--bg)', color:'var(--text-2)' },
  };
  const c = colors[badgeColor] ?? colors.gray;

  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 0', borderBottom:'0.5px solid var(--border)' }}>
      <div style={{ width:28, height:28, borderRadius:8, background:iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>{name}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text-2)', lineHeight:1.4 }}>{sub}</div>}
      </div>
      {badge && (
        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, fontWeight:500, flexShrink:0, background:c.bg, color:c.color }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ color:'var(--text-3)', fontSize:13, textAlign:'center', padding:'32px 0' }}>{text}</div>;
}

function Loader() {
  return <div style={{ color:'var(--text-3)', fontSize:13, padding:'24px 0' }}>Loading insights...</div>;
}