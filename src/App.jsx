import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";

// ─── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAvqMGTOaC17KOFItqdMt40QBtsNcCcmwQ",
  authDomain: "baby-tracker-2d34c.firebaseapp.com",
  projectId: "baby-tracker-2d34c",
  storageBucket: "baby-tracker-2d34c.firebasestorage.app",
  messagingSenderId: "763491127750",
  appId: "1:763491127750:web:79d6fd601e812b5a8f62c7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pastel = {
  bg: "#FFF8F2", peach: "#FFCBA4", lavender: "#D4C5F9",
  rose: "#F9C5D1", text: "#3D2C2C", muted: "#9E8585", border: "#F0E0D6",
};
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital@0;1&display=swap');`;

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}
function todayStr() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}
function minuteDiff(start, end) {
  const s = new Date(`2000-01-01T${start}`);
  const e = new Date(`2000-01-01T${end}`);
  return Math.round((e - s) / 60000);
}
function fmtMin(mins) {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function fmtMinFull(mins) {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}
function getDayStats(dayData) {
  if (!dayData) return { oz: 0, tetaMins: 0, napMins: 0, napCount: 0 };
  const oz = (dayData.feeds || []).filter(f => f.feedType === "tetero" && f.oz).reduce((s, f) => s + parseFloat(f.oz || 0), 0);
  const tetaMins = (dayData.feeds || []).filter(f => f.feedType === "teta" && f.duration).reduce((s, f) => s + parseInt(f.duration || 0), 0);
  const napMins = (dayData.naps || []).reduce((s, n) => s + (n.durationMins || 0), 0);
  const napCount = (dayData.naps || []).length;
  return { oz, tetaMins, napMins, napCount };
}
async function saveDay(date, dayData) {
  await setDoc(doc(db, "days", date), dayData);
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ background: "#F0E8F8", borderRadius: 6, height: 7, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ─── History card ─────────────────────────────────────────────────────────────
function HistoryCard({ dateStr, stats, maxOz, maxTeta, maxNap, isToday, onClick }) {
  const hasData = stats.oz > 0 || stats.tetaMins > 0 || stats.napMins > 0;
  return (
    <div onClick={onClick} style={{
      background: "white", borderRadius: 20, padding: "14px 16px", marginBottom: 10,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)", cursor: "pointer",
      border: `2px solid ${isToday ? pastel.peach : pastel.border}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasData ? 12 : 0 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: pastel.text }}>{isToday ? "Hoy" : formatDateShort(dateStr)}</div>
          {!isToday && <div style={{ fontSize: 11, color: pastel.muted, marginTop: 1 }}>{formatDate(dateStr)}</div>}
        </div>
        {isToday && <div style={{ background: pastel.peach, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: "#3D2C2C" }}>HOY</div>}
      </div>
      {!hasData ? (
        <div style={{ fontSize: 12, color: pastel.muted }}>Sin registros</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {stats.oz > 0 && <div style={{ background: "#FFF0E8", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#B05020" }}>🍼 {stats.oz} oz</div>}
            {stats.tetaMins > 0 && <div style={{ background: "#FFF0E8", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#C04060" }}>🤱 {fmtMin(stats.tetaMins)}</div>}
            {stats.napCount > 0 && <div style={{ background: "#F2EEFF", borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#6B4C9E" }}>😴 {stats.napCount} {stats.napCount === 1 ? "siesta" : "siestas"} · {fmtMin(stats.napMins)}</div>}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {maxOz > 0 && <div style={{ flex: 1, minWidth: 0 }}><MiniBar value={stats.oz} max={maxOz} color="linear-gradient(90deg,#FFCBA4,#F9A060)" /><div style={{ fontSize: 10, color: pastel.muted, textAlign: "center", marginTop: 3, fontWeight: 600 }}>oz</div></div>}
            {maxTeta > 0 && <div style={{ flex: 1, minWidth: 0 }}><MiniBar value={stats.tetaMins} max={maxTeta} color="linear-gradient(90deg,#F9C5D1,#F06080)" /><div style={{ fontSize: 10, color: pastel.muted, textAlign: "center", marginTop: 3, fontWeight: 600 }}>teta</div></div>}
            {maxNap > 0 && <div style={{ flex: 1, minWidth: 0 }}><MiniBar value={stats.napMins} max={maxNap} color="linear-gradient(90deg,#D4C5F9,#A080E0)" /><div style={{ fontSize: 10, color: pastel.muted, textAlign: "center", marginTop: 3, fontWeight: 600 }}>sueño</div></div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ onSelectDay }) {
  const [allData, setAllData] = useState({});

  useEffect(() => {
    const today = new Date();
    const dates = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    });
    const unsubs = dates.map(date => {
      return onSnapshot(doc(db, "days", date), snap => {
        setAllData(prev => ({ ...prev, [date]: snap.exists() ? snap.data() : { feeds: [], naps: [] } }));
      });
    });
    return () => unsubs.forEach(u => u());
  }, []);

  const sortedDays = Object.keys(allData)
    .filter(d => { const s = getDayStats(allData[d]); return s.oz > 0 || s.tetaMins > 0 || s.napMins > 0; })
    .sort((a, b) => b.localeCompare(a));

  if (sortedDays.length === 0) return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: pastel.text, marginBottom: 8 }}>Sin historial aún</div>
      <div style={{ fontSize: 14, color: pastel.muted }}>Empieza a registrar y aquí verás el comparativo por día.</div>
    </div>
  );

  const allStats = sortedDays.map(d => ({ date: d, stats: getDayStats(allData[d]) }));
  const maxOz = Math.max(...allStats.map(d => d.stats.oz), 0);
  const maxTeta = Math.max(...allStats.map(d => d.stats.tetaMins), 0);
  const maxNap = Math.max(...allStats.map(d => d.stats.napMins), 0);
  const daysWithOz = allStats.filter(d => d.stats.oz > 0);
  const daysWithTeta = allStats.filter(d => d.stats.tetaMins > 0);
  const daysWithNap = allStats.filter(d => d.stats.napMins > 0);
  const avgOz = daysWithOz.length ? +(daysWithOz.reduce((s, d) => s + d.stats.oz, 0) / daysWithOz.length).toFixed(1) : null;
  const avgTeta = daysWithTeta.length ? Math.round(daysWithTeta.reduce((s, d) => s + d.stats.tetaMins, 0) / daysWithTeta.length) : null;
  const avgNap = daysWithNap.length ? Math.round(daysWithNap.reduce((s, d) => s + d.stats.napMins, 0) / daysWithNap.length) : null;
  const avgNapCount = daysWithNap.length ? +(daysWithNap.reduce((s, d) => s + d.stats.napCount, 0) / daysWithNap.length).toFixed(1) : null;
  const today = todayStr();

  return (
    <div>
      <div style={{ padding: "0 20px 16px" }}>
        <div style={{ background: "linear-gradient(135deg,#FFF0E8,#F2EEFF)", borderRadius: 20, padding: 16, border: `1px solid ${pastel.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: pastel.muted, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14 }}>
            Promedio diario · {sortedDays.length} {sortedDays.length === 1 ? "día" : "días"}
          </div>
          <div style={{ display: "flex" }}>
            {avgOz && <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#B05020" }}>{avgOz} oz</div><div style={{ fontSize: 11, color: pastel.muted, marginTop: 2 }}>🍼 Tetero</div></div>}
            {avgTeta && <div style={{ flex: 1, textAlign: "center", borderLeft: avgOz ? `1px solid ${pastel.border}` : "none" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#C04060" }}>{fmtMin(avgTeta)}</div><div style={{ fontSize: 11, color: pastel.muted, marginTop: 2 }}>🤱 Teta</div></div>}
            {avgNap && <div style={{ flex: 1, textAlign: "center", borderLeft: (avgOz || avgTeta) ? `1px solid ${pastel.border}` : "none" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#6B4C9E" }}>{fmtMin(avgNap)}</div><div style={{ fontSize: 11, color: pastel.muted, marginTop: 2 }}>😴 Sueño · {avgNapCount}x</div></div>}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 20px 10px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, color: pastel.muted, fontWeight: 700 }}>BARRAS:</div>
        {maxOz > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: pastel.muted }}><div style={{ width: 14, height: 6, borderRadius: 3, background: "linear-gradient(90deg,#FFCBA4,#F9A060)" }} /> oz tetero</div>}
        {maxTeta > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: pastel.muted }}><div style={{ width: 14, height: 6, borderRadius: 3, background: "linear-gradient(90deg,#F9C5D1,#F06080)" }} /> min teta</div>}
        {maxNap > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: pastel.muted }}><div style={{ width: 14, height: 6, borderRadius: 3, background: "linear-gradient(90deg,#D4C5F9,#A080E0)" }} /> min sueño</div>}
      </div>
      <div style={{ padding: "0 20px" }}>
        {allStats.map(({ date, stats }) => (
          <HistoryCard key={date} dateStr={date} stats={stats}
            maxOz={maxOz} maxTeta={maxTeta} maxNap={maxNap}
            isToday={date === today} onClick={() => onSelectDay(date)} />
        ))}
      </div>
    </div>
  );
}

// ─── Guide Tab ────────────────────────────────────────────────────────────────
const DEFAULT_GUIDE = {
  month: 1,
  napHours: "",
  napSchedule: "",
  feedOz: "",
  feedSchedule: "",
  feedNotes: "",
};

function GuideTab() {
  const [guide, setGuide] = useState(DEFAULT_GUIDE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_GUIDE);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "guide"), snap => {
      if (snap.exists()) setGuide(snap.data());
      setSynced(true);
    });
    return () => unsub();
  }, []);

  function startEdit() { setDraft(guide); setEditing(true); }
  async function saveGuide() {
    await setDoc(doc(db, "config", "guide"), draft);
    setGuide(draft);
    setEditing(false);
  }

  const months = Array.from({ length: 24 }, (_, i) => i + 1);

  const InfoCard = ({ icon, color, bg, title, value, sub }) => (
    <div style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: `2px solid ${pastel.border}`, display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: pastel.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{title}</div>
        {value ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color, marginBottom: sub ? 4 : 0 }}>{value}</div>
            {sub && <div style={{ fontSize: 13, color: pastel.muted, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{sub}</div>}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "#CCC", fontStyle: "italic" }}>Sin definir</div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 20px 20px" }}>

      {/* Month badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #FFCBA4, #F9C5D1)", borderRadius: 20, padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>👶</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B4C4C", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ramona tiene</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3D2C2C" }}>{guide.month} {guide.month === 1 ? "mes" : "meses"}</div>
          </div>
        </div>
        <button onClick={startEdit} style={{ background: "white", border: `2px solid ${pastel.border}`, borderRadius: 14, padding: "10px 16px", fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", color: pastel.text }}>
          ✏️ Editar
        </button>
      </div>

      {/* Sleep section */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: pastel.muted, marginBottom: 12 }}>😴 Siestas</div>
      <InfoCard icon="⏱" color="#6B4C9E" title="Horas de sueño diurno" value={guide.napHours ? `${guide.napHours} horas al día` : null} />
      <InfoCard icon="🕐" color="#6B4C9E" title="Horario aproximado" value={guide.napSchedule ? " " : null} sub={guide.napSchedule || null} />

      {/* Feed section */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: pastel.muted, marginBottom: 12, marginTop: 8 }}>🍼 Leche</div>
      <InfoCard icon="🥛" color="#B05020" title="Cantidad por toma" value={guide.feedOz ? `${guide.feedOz} oz por toma` : null} />
      <InfoCard icon="🕐" color="#B05020" title="Horario aproximado" value={guide.feedSchedule ? " " : null} sub={guide.feedSchedule || null} />
      {guide.feedNotes && (
        <div style={{ background: "#FFFBF0", border: "2px solid #FFE9B0", borderRadius: 16, padding: "12px 16px", fontSize: 13, color: "#7A5C00", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          📝 {guide.feedNotes}
        </div>
      )}

      {!synced && <div style={{ textAlign: "center", color: pastel.muted, fontSize: 13, marginTop: 16 }}>Cargando...</div>}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(61,44,44,0.4)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setEditing(false)}>
          <div style={{ background: pastel.bg, borderRadius: "32px 32px 0 0", padding: "28px 24px 40px", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ width: 40, height: 4, background: "#E0D0C8", borderRadius: 2, margin: "0 auto 20px" }} />
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, marginBottom: 20 }}>✏️ Editar guía de Ramona</h2>

            {/* Month selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Mes de Ramona</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {months.map(m => (
                  <button key={m} onClick={() => setDraft(d => ({ ...d, month: m }))}
                    style={{ padding: "8px 12px", borderRadius: 12, border: `2px solid ${draft.month === m ? pastel.peach : pastel.border}`, background: draft.month === m ? "#FFF0E8" : "white", fontFamily: "Nunito, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", color: draft.month === m ? pastel.text : pastel.muted }}>
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: pastel.muted, margin: "20px 0 12px" }}>😴 Siestas</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Horas de sueño diurno</label>
              <input style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: `2px solid ${pastel.border}`, background: "white", fontFamily: "Nunito, sans-serif", fontSize: 15, color: pastel.text, outline: "none", boxSizing: "border-box" }}
                placeholder="ej: 3-4" value={draft.napHours} onChange={e => setDraft(d => ({ ...d, napHours: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Horario de siestas</label>
              <textarea style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: `2px solid ${pastel.border}`, background: "white", fontFamily: "Nunito, sans-serif", fontSize: 14, color: pastel.text, outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box", lineHeight: 1.6 }}
                placeholder={"ej:\n9:00am - 10:30am\n1:00pm - 3:00pm"} value={draft.napSchedule} onChange={e => setDraft(d => ({ ...d, napSchedule: e.target.value }))} />
            </div>

            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: pastel.muted, margin: "20px 0 12px" }}>🍼 Leche</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Cantidad sugerida por toma (oz)</label>
              <input style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: `2px solid ${pastel.border}`, background: "white", fontFamily: "Nunito, sans-serif", fontSize: 15, color: pastel.text, outline: "none", boxSizing: "border-box" }}
                placeholder="ej: 4-5" value={draft.feedOz} onChange={e => setDraft(d => ({ ...d, feedOz: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Horario de tomas</label>
              <textarea style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: `2px solid ${pastel.border}`, background: "white", fontFamily: "Nunito, sans-serif", fontSize: 14, color: pastel.text, outline: "none", resize: "vertical", minHeight: 80, boxSizing: "border-box", lineHeight: 1.6 }}
                placeholder={"ej:\n7:00am, 10:00am\n1:00pm, 4:00pm, 7:00pm"} value={draft.feedSchedule} onChange={e => setDraft(d => ({ ...d, feedSchedule: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: pastel.muted, marginBottom: 6, display: "block", letterSpacing: "0.05em", textTransform: "uppercase" }}>Notas adicionales</label>
              <textarea style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: `2px solid ${pastel.border}`, background: "white", fontFamily: "Nunito, sans-serif", fontSize: 14, color: pastel.text, outline: "none", resize: "vertical", minHeight: 70, boxSizing: "border-box", lineHeight: 1.6 }}
                placeholder="ej: Toma sólidos 2 veces al día, ofrecer agua..." value={draft.feedNotes} onChange={e => setDraft(d => ({ ...d, feedNotes: e.target.value }))} />
            </div>

            <button onClick={saveGuide} style={{ width: "100%", padding: 16, borderRadius: 18, border: "none", background: "linear-gradient(135deg, #FFCBA4, #F9C5D1)", fontFamily: "Nunito, sans-serif", fontSize: 16, fontWeight: 800, color: "#3D2C2C", cursor: "pointer", boxShadow: "0 4px 16px rgba(255,140,100,0.3)", marginTop: 8 }}>
              Guardar guía
            </button>
            <button onClick={() => setEditing(false)} style={{ width: "100%", padding: 12, borderRadius: 18, border: "none", background: "none", fontFamily: "Nunito, sans-serif", fontSize: 14, color: pastel.muted, cursor: "pointer", marginTop: 6 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  ${fonts}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; background: ${pastel.bg}; color: ${pastel.text}; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100vh; padding-bottom: 100px; }
  .header { background: linear-gradient(135deg, #FFCBA4 0%, #F9C5D1 50%, #D4C5F9 100%); padding: 28px 24px 0; border-radius: 0 0 32px 32px; box-shadow: 0 4px 20px rgba(255,140,100,0.15); margin-bottom: 20px; }
  .header-top { margin-bottom: 16px; }
  .header h1 { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; color: #3D2C2C; }
  .header p { font-size: 13px; color: #6B4C4C; margin-top: 4px; }
  .sync-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-left: 6px; vertical-align: middle; }
  .sync-dot.online { background: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.3); }
  .sync-dot.offline { background: #FFC107; }
  .tab-bar { display: flex; }
  .tab-btn { flex: 1; padding: 12px 8px; border: none; background: none; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700; color: rgba(61,44,44,0.45); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s; }
  .tab-btn.active { color: #3D2C2C; border-bottom-color: #3D2C2C; }
  .date-nav { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; margin-bottom: 16px; }
  .date-nav button { background: white; border: 2px solid ${pastel.border}; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .date-nav button:hover { border-color: ${pastel.peach}; background: #FFF0E8; }
  .date-nav .date-label { font-weight: 700; font-size: 15px; color: ${pastel.text}; text-align: center; flex: 1; }
  .summary-bar { display: flex; gap: 10px; padding: 0 20px; margin-bottom: 20px; }
  .summary-chip { flex: 1; background: white; border-radius: 16px; padding: 12px 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 2px solid ${pastel.border}; }
  .summary-chip .val { font-size: 19px; font-weight: 800; color: ${pastel.text}; }
  .summary-chip .lbl { font-size: 11px; color: ${pastel.muted}; margin-top: 2px; }
  .section { padding: 0 20px; margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${pastel.muted}; margin-bottom: 12px; }
  .entry-card { background: white; border-radius: 20px; padding: 14px 16px; margin-bottom: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); border-left: 4px solid ${pastel.peach}; display: flex; align-items: flex-start; gap: 12px; position: relative; animation: slideIn 0.3s ease; }
  .entry-card.nap { border-left-color: ${pastel.lavender}; }
  .entry-card .icon { font-size: 24px; line-height: 1; }
  .entry-card .info { flex: 1; }
  .entry-card .info .time { font-size: 11px; color: ${pastel.muted}; font-weight: 600; }
  .entry-card .info .title { font-size: 15px; font-weight: 700; color: ${pastel.text}; margin: 2px 0; }
  .entry-card .info .sub { font-size: 12px; color: ${pastel.muted}; }
  .entry-card .amount { font-size: 18px; font-weight: 800; color: ${pastel.text}; white-space: nowrap; }
  .delete-btn { position: absolute; top: 10px; right: 12px; background: none; border: none; cursor: pointer; font-size: 14px; color: #CCC; transition: color 0.2s; }
  .delete-btn:hover { color: #F9C5D1; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .empty-state { text-align: center; padding: 20px; color: ${pastel.muted}; font-size: 14px; }
  .fab-area { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px; z-index: 100; }
  .fab { display: flex; align-items: center; gap: 8px; padding: 14px 22px; border-radius: 50px; border: none; cursor: pointer; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 800; box-shadow: 0 6px 20px rgba(0,0,0,0.15); transition: all 0.2s; }
  .fab:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.2); }
  .fab-feed { background: linear-gradient(135deg, #FFCBA4, #F9C5D1); color: #3D2C2C; }
  .fab-nap { background: linear-gradient(135deg, #D4C5F9, #C5DFF9); color: #3D2C2C; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(61,44,44,0.4); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: ${pastel.bg}; border-radius: 32px 32px 0 0; padding: 28px 24px 40px; width: 100%; max-width: 480px; animation: slideUp 0.3s ease; max-height: 92vh; overflow-y: auto; }
  @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal h2 { font-family: 'Playfair Display', serif; font-size: 22px; margin-bottom: 20px; }
  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 12px; font-weight: 700; color: ${pastel.muted}; margin-bottom: 6px; display: block; letter-spacing: 0.05em; text-transform: uppercase; }
  .toggle-group { display: flex; gap: 8px; }
  .toggle-btn { flex: 1; padding: 12px 8px; border-radius: 14px; border: 2px solid ${pastel.border}; background: white; cursor: pointer; font-family: 'Nunito', sans-serif; font-size: 13px; font-weight: 700; color: ${pastel.muted}; transition: all 0.2s; text-align: center; }
  .toggle-btn.active { border-color: ${pastel.peach}; background: #FFF0E8; color: ${pastel.text}; }
  .input { width: 100%; padding: 12px 16px; border-radius: 14px; border: 2px solid ${pastel.border}; background: white; font-family: 'Nunito', sans-serif; font-size: 15px; color: ${pastel.text}; outline: none; transition: border-color 0.2s; }
  .input:focus { border-color: ${pastel.peach}; }
  .btn-primary { width: 100%; padding: 16px; border-radius: 18px; border: none; background: linear-gradient(135deg, #FFCBA4, #F9C5D1); font-family: 'Nunito', sans-serif; font-size: 16px; font-weight: 800; color: #3D2C2C; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(255,140,100,0.3); margin-top: 8px; }
  .btn-primary:hover { transform: translateY(-1px); }
  .btn-primary.nap { background: linear-gradient(135deg, #D4C5F9, #C5DFF9); }
  .btn-cancel { width: 100%; padding: 12px; border-radius: 18px; border: none; background: none; font-family: 'Nunito', sans-serif; font-size: 14px; color: ${pastel.muted}; cursor: pointer; margin-top: 6px; }
  .time-row { display: flex; gap: 12px; }
  .time-row .form-group { flex: 1; }
  .drag-handle { width: 40px; height: 4px; background: #E0D0C8; border-radius: 2px; margin: 0 auto 20px; }
`;

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("registro");
  const [viewDate, setViewDate] = useState(todayStr());
  const [dayData, setDayData] = useState({ feeds: [], naps: [] });
  const [synced, setSynced] = useState(false);
  const [modal, setModal] = useState(null);
  const [feedType, setFeedType] = useState("teta");
  const [bottleType, setBottleType] = useState("formula");
  const [feedOz, setFeedOz] = useState("");
  const [feedDuration, setFeedDuration] = useState("");
  const [feedTime, setFeedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [napStart, setNapStart] = useState("");
  const [napEnd, setNapEnd] = useState("");

  useEffect(() => {
    setSynced(false);
    const unsub = onSnapshot(doc(db, "days", viewDate), snap => {
      setDayData(snap.exists() ? snap.data() : { feeds: [], naps: [] });
      setSynced(true);
    });
    return () => unsub();
  }, [viewDate]);

  const { oz: totalOz, tetaMins: totalFeedMins, napMins: totalNapMins } = getDayStats(dayData);
  const isToday = viewDate === todayStr();

  async function updateDay(updater) {
    const updated = updater(dayData);
    setDayData(updated);
    await saveDay(viewDate, updated);
  }
  async function addFeed() {
    const entry = { id: Date.now(), time: feedTime, feedType, bottleType: feedType === "tetero" ? bottleType : null, oz: feedType === "tetero" ? feedOz : null, duration: feedType === "teta" ? feedDuration : null };
    await updateDay(day => ({ ...day, feeds: [entry, ...(day.feeds || [])].sort((a, b) => b.time.localeCompare(a.time)) }));
    setModal(null); setFeedOz(""); setFeedDuration("");
    setFeedTime(new Date().toTimeString().slice(0, 5));
  }
  async function addNap() {
    if (!napStart || !napEnd) return;
    const durationMins = minuteDiff(napStart, napEnd);
    if (durationMins <= 0) return;
    const entry = { id: Date.now(), start: napStart, end: napEnd, durationMins };
    await updateDay(day => ({ ...day, naps: [entry, ...(day.naps || [])].sort((a, b) => b.start.localeCompare(a.start)) }));
    setModal(null); setNapStart(""); setNapEnd("");
  }
  async function deleteFeed(id) { await updateDay(day => ({ ...day, feeds: (day.feeds || []).filter(f => f.id !== id) })); }
  async function deleteNap(id) { await updateDay(day => ({ ...day, naps: (day.naps || []).filter(n => n.id !== id) })); }
  function changeDay(delta) {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setViewDate(d.toISOString().split("T")[0]);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <h1>🍼 Mi bebé <span className={`sync-dot ${synced ? "online" : "offline"}`} /></h1>
            <p>{synced ? "Sincronizado en tiempo real ✓" : "Conectando..."}</p>
          </div>
          <div className="tab-bar">
            <button className={`tab-btn ${tab === "registro" ? "active" : ""}`} onClick={() => setTab("registro")}>📝 Registro</button>
            <button className={`tab-btn ${tab === "historico" ? "active" : ""}`} onClick={() => setTab("historico")}>📊 Histórico</button>
            <button className={`tab-btn ${tab === "guia" ? "active" : ""}`} onClick={() => setTab("guia")}>📋 Guía</button>
          </div>
        </div>

        {tab === "registro" && (<>
          <div className="date-nav">
            <button onClick={() => changeDay(-1)}>‹</button>
            <div className="date-label">{isToday ? "Hoy" : formatDate(viewDate)}</div>
            <button onClick={() => changeDay(1)} disabled={isToday} style={{ opacity: isToday ? 0.3 : 1 }}>›</button>
          </div>
          <div className="summary-bar">
            <div className="summary-chip"><div className="val">{totalOz > 0 ? `${totalOz}oz` : "—"}</div><div className="lbl">🍼 Tetero</div></div>
            <div className="summary-chip"><div className="val">{totalFeedMins > 0 ? fmtMinFull(totalFeedMins) : "—"}</div><div className="lbl">🤱 Teta</div></div>
            <div className="summary-chip"><div className="val">{totalNapMins > 0 ? fmtMinFull(totalNapMins) : "—"}</div><div className="lbl">😴 Sueño</div></div>
          </div>
          <div className="section">
            <div className="section-title">🍼 Tomas</div>
            {(dayData.feeds || []).length === 0 && <div className="empty-state">Sin tomas registradas</div>}
            {(dayData.feeds || []).map(f => (
              <div className="entry-card" key={f.id}>
                <div className="icon">{f.feedType === "teta" ? "🤱" : "🍼"}</div>
                <div className="info">
                  <div className="time">{f.time}</div>
                  <div className="title">{f.feedType === "teta" ? "Lactancia" : f.bottleType === "formula" ? "Fórmula" : "Leche materna"}</div>
                  {f.feedType === "teta" && f.duration && <div className="sub">⏱ {fmtMinFull(parseInt(f.duration))}</div>}
                </div>
                {f.feedType === "tetero" && f.oz && <div className="amount">{f.oz} oz</div>}
                <button className="delete-btn" onClick={() => deleteFeed(f.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="section">
            <div className="section-title">😴 Siestas</div>
            {(dayData.naps || []).length === 0 && <div className="empty-state">Sin siestas registradas</div>}
            {(dayData.naps || []).map(n => (
              <div className="entry-card nap" key={n.id}>
                <div className="icon">🌙</div>
                <div className="info">
                  <div className="time">{n.start} — {n.end}</div>
                  <div className="title">Siesta</div>
                  <div className="sub">⏱ {fmtMinFull(n.durationMins)}</div>
                </div>
                <button className="delete-btn" onClick={() => deleteNap(n.id)}>✕</button>
              </div>
            ))}
          </div>
          <div className="fab-area">
            <button className="fab fab-feed" onClick={() => { setFeedTime(new Date().toTimeString().slice(0, 5)); setModal("feed"); }}>🍼 Toma</button>
            <button className="fab fab-nap" onClick={() => setModal("nap")}>😴 Siesta</button>
          </div>
        </>)}

        {tab === "historico" && <HistoryTab onSelectDay={date => { setViewDate(date); setTab("registro"); }} />}

        {tab === "guia" && <GuideTab />}

        {modal === "feed" && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="modal">
              <div className="drag-handle" />
              <h2>🍼 Registrar toma</h2>
              <div className="form-group"><label className="form-label">Hora</label><input className="input" type="time" value={feedTime} onChange={e => setFeedTime(e.target.value)} /></div>
              <div className="form-group">
                <label className="form-label">Tipo de toma</label>
                <div className="toggle-group">
                  <button className={`toggle-btn ${feedType === "teta" ? "active" : ""}`} onClick={() => setFeedType("teta")}>🤱 Teta</button>
                  <button className={`toggle-btn ${feedType === "tetero" ? "active" : ""}`} onClick={() => setFeedType("tetero")}>🍼 Tetero</button>
                </div>
              </div>
              {feedType === "tetero" && (<>
                <div className="form-group"><label className="form-label">Contenido</label><div className="toggle-group"><button className={`toggle-btn ${bottleType === "formula" ? "active" : ""}`} onClick={() => setBottleType("formula")}>🥛 Fórmula</button><button className={`toggle-btn ${bottleType === "materna" ? "active" : ""}`} onClick={() => setBottleType("materna")}>💛 Leche materna</button></div></div>
                <div className="form-group"><label className="form-label">Cantidad (oz)</label><input className="input" type="number" placeholder="ej: 4" value={feedOz} onChange={e => setFeedOz(e.target.value)} min="0" step="0.5" /></div>
              </>)}
              {feedType === "teta" && <div className="form-group"><label className="form-label">Duración (minutos)</label><input className="input" type="number" placeholder="ej: 20" value={feedDuration} onChange={e => setFeedDuration(e.target.value)} min="0" /></div>}
              <button className="btn-primary" onClick={addFeed}>Guardar toma</button>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        )}
        {modal === "nap" && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="modal">
              <div className="drag-handle" />
              <h2>😴 Registrar siesta</h2>
              <div className="time-row">
                <div className="form-group"><label className="form-label">Inicio</label><input className="input" type="time" value={napStart} onChange={e => setNapStart(e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Fin</label><input className="input" type="time" value={napEnd} onChange={e => setNapEnd(e.target.value)} /></div>
              </div>
              {napStart && napEnd && minuteDiff(napStart, napEnd) > 0 && (
                <div style={{ textAlign: "center", padding: 10, background: "#F2EEFF", borderRadius: 14, marginBottom: 12, fontSize: 14, fontWeight: 700, color: "#6B5B9E" }}>
                  ⏱ Duración: {fmtMinFull(minuteDiff(napStart, napEnd))}
                </div>
              )}
              <button className="btn-primary nap" onClick={addNap}>Guardar siesta</button>
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
