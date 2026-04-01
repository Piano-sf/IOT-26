import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Thermometer, Droplets, Wind, Activity, AlertTriangle,
  CheckCircle, Clock, Zap, Cat, Heart, Bell, Wifi,
  TrendingUp, Shield, X, ChevronRight, Circle, Calendar
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (d) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const fmtShort = (d) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

function barColor(duration) {
  if (duration > 5) return "#ef4444";
  if (duration > 3) return "#f97316";
  return "#10b981";
}

function healthStatus(duration, freq) {
  if (duration > 5 && freq >= 5) return { label: "High Risk – UTI/Stone", color: "#ef4444", icon: "🚨" };
  if (duration > 5) return { label: "Prolonged Visit – Monitor", color: "#f97316", icon: "⚠️" };
  if (freq >= 5) return { label: "High Frequency – Check Kidney", color: "#f97316", icon: "⚠️" };
  return { label: "Normal", color: "#10b981", icon: "✅" };
}

// ── Seed Data ───────────────────────────────────────────────────────────────
const seedVisits = () => {
  const base = new Date();
  base.setHours(6, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(base.getTime() + i * 110 * 60 * 1000);
    const duration = +(1 + Math.random() * 2).toFixed(1); // เริ่มต้นแบบ Normal ให้กราฟไม่แดงเถือก
    return { id: uid(), time: fmtShort(t), duration, raw: t };
  });
};

// ข้อมูลจำลองรายสัปดาห์ (โชว์เทรนด์พฤติกรรมเสี่ยงโรคนิ่ว)
const seedWeeklyStats = [
  { id: 'w1', date: "27 Mar", visitCount: 3, duration: 2.5, riskScore: 10 },
  { id: 'w2', date: "28 Mar", visitCount: 4, duration: 2.8, riskScore: 15 },
  { id: 'w3', date: "29 Mar", visitCount: 3, duration: 2.4, riskScore: 10 },
  { id: 'w4', date: "30 Mar", visitCount: 5, duration: 3.5, riskScore: 30 },
  { id: 'w5', date: "31 Mar", visitCount: 6, duration: 4.2, riskScore: 55 },
  { id: 'w6', date: "01 Apr", visitCount: 8, duration: 6.1, riskScore: 85 },
  { id: 'w7', date: "02 Apr", visitCount: 9, duration: 7.5, riskScore: 95 }
];

const seedNotifications = () => [
  { id: uid(), type: "info", msg: "System online — all sensors nominal", ts: new Date() },
  { id: uid(), type: "warn", msg: "Ammonia elevated: 0.18 ppm — fan activated", ts: new Date(Date.now() - 4 * 60000) },
  { id: uid(), type: "ok",   msg: "Visit #3 completed — Normal duration (2.4 min)", ts: new Date(Date.now() - 9 * 60000) },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ children, className = "" }) {
  return (
    <div className={`bg-slate-800/90 border border-slate-700/60 rounded-[2.5rem] shadow-xl shadow-slate-900/50 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function SensorCard({ icon: Icon, label, value, unit, accent, sub }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: `${accent}18` }}>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        <span className="text-sm text-slate-500 mb-0.5">{unit}</span>
      </div>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function AirPurityBar({ pct }) {
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f97316" : "#ef4444";
  const label = pct >= 80 ? "Excellent" : pct >= 50 ? "Moderate" : "Poor";
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: `${color}18` }}>
          <Wind size={16} style={{ color }} />
        </div>
        <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">Air Purity</span>
        <span className="ml-auto text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
      <div className="w-full h-2.5 rounded-full bg-slate-700">
        <motion.div
          className="h-2.5 rounded-full"
          style={{ background: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs text-slate-500">{pct}% clean air index</span>
    </div>
  );
}

function DiagnosticsConsole({ fanActive, sprayActive, ammonia }) {
  return (
    <div className="bg-slate-950 border border-slate-700/40 rounded-2xl p-4 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <Circle size={8} className="text-emerald-400 fill-emerald-400 animate-pulse" />
        <span className="text-emerald-400 font-semibold tracking-widest uppercase text-[10px]">Diagnostics Console</span>
      </div>
      <div className="space-y-1.5 text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">›</span>
          <span className="text-slate-400">FAN:</span>
          <span style={{ color: fanActive ? "#10b981" : "#64748b" }}>
            {fanActive ? "ACTIVE" : "STANDBY"}
          </span>
          {fanActive && <span className="text-emerald-400 animate-pulse">●</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">›</span>
          <span className="text-slate-400">SPRAY:</span>
          <span style={{ color: sprayActive ? "#ef4444" : "#64748b" }}>
            {sprayActive ? "DETECTED" : "IDLE"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">›</span>
          <span className="text-slate-400">NH₃:</span>
          <span style={{ color: ammonia > 0.15 ? "#f97316" : "#10b981" }}>
            {ammonia.toFixed(2)} ppm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">›</span>
          <span className="text-slate-400">STATUS:</span>
          <span className="text-emerald-400">EDGE AI ONLINE</span>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ label, color, value }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 flex flex-col gap-2">
      <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <span className="text-sm font-semibold" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function NotificationItem({ n }) {
  const colors = { warn: "#f97316", ok: "#10b981", info: "#38bdf8", error: "#ef4444" };
  const icons  = { warn: AlertTriangle, ok: CheckCircle, info: Bell, error: AlertTriangle };
  const Icon   = icons[n.type] || Bell;
  const color  = colors[n.type] || "#94a3b8";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1,  y: 0,   scale: 1    }}
      exit   ={{ opacity: 0,  x: 40,  scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="flex items-start gap-3 px-4 py-3 border-b border-slate-700/30 last:border-b-0"
    >
      <div className="mt-0.5 p-1.5 rounded-lg shrink-0" style={{ background: `${color}18` }}>
        <Icon size={12} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-200 leading-relaxed">{n.msg}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{fmt(n.ts)}</p>
      </div>
    </motion.div>
  );
}

// ── Visit Modal ─────────────────────────────────────────────────────────────
function VisitModal({ visit, freq, onClose }) {
  const status = healthStatus(visit.duration, freq);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <motion.div
        className="relative bg-slate-800 border border-slate-700/60 rounded-[2rem] p-7 w-full max-w-sm shadow-2xl"
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1,    y: 0  }}
        exit   ={{ scale: 0.88, y: 24 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors">
          <X size={14} className="text-slate-400" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-emerald-500/10">
            <Cat size={22} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Visit Details</h3>
            <p className="text-xs text-slate-400">{visit.time || visit.date}</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            ["Duration",    `${visit.duration} min`],
            ["Health Status", visit.riskScore ? `Risk: ${visit.riskScore}%` : status.label],
            ["Daily Freq.",  visit.visitCount ? `${visit.visitCount} visits` : `${freq} visits today`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2.5 border-b border-slate-700/40 last:border-b-0">
              <span className="text-xs text-slate-400">{k}</span>
              <span className="text-sm font-semibold" style={{ color: k === "Health Status" && !visit.riskScore ? status.color : "#e2e8f0" }}>
                {k === "Health Status" && !visit.riskScore ? `${status.icon} ${v}` : v}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 p-3 rounded-xl" style={{ background: `${status.color}10`, border: `1px solid ${status.color}30` }}>
          <p className="text-xs text-center" style={{ color: status.color }}>
            {visit.duration > 5
              ? "⚠️ Extended visit detected. Monitor for UTI or urinary obstruction signs."
              : "✅ Visit duration within normal range."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Custom Bar Tooltip ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, viewMode }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  
  if (viewMode === "weekly") {
    return (
      <div className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs shadow-xl min-w-[120px]">
        <p className="text-slate-400 font-semibold mb-1">{d.date}</p>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300">Avg Duration:</span>
          <span className="text-white font-bold">{d.duration} m</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-300">Frequency:</span>
          <span className="text-white font-bold">{d.visitCount} times</span>
        </div>
        <div className="mt-1 pt-1 border-t border-slate-700/50 text-[10px]">
          <span style={{ color: d.riskScore > 50 ? "#ef4444" : "#10b981" }}>
            Risk Score: {d.riskScore}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{d.time}</p>
      <p className="text-white font-bold">{d.duration} min</p>
      <p style={{ color: barColor(d.duration) }}>
        {d.duration > 5 ? "🚨 Risk" : "✅ Normal"}
      </p>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [viewMode,  setViewMode]  = useState("today"); // "today" | "weekly"
  const [visits,    setVisits]    = useState(seedVisits);
  const [notifs,    setNotifs]    = useState(seedNotifications);
  const [selected,  setSelected]  = useState(null);
  const [sensors,   setSensors]   = useState({ temp: 24.3, hum: 58, air: 90, ammonia: 0.08, fan: false, spray: false });
  const [ticker,    setTicker]    = useState(0);
  const notifRef = useRef(null);

  const pushNotif = useCallback((type, msg) => {
    setNotifs((prev) => [{ id: uid(), type, msg, ts: new Date() }, ...prev].slice(0, 40));
  }, []);

  // ── Simulate IoT data ───────────────────────────────────────────────────
  const simulateNewIoTData = useCallback(() => {
    // โอกาสเกิดวิกฤต (ทะลุ 5 นาที) เพื่อโชว์ Real-time alert
    const isCrisis = Math.random() < 0.2; 
    const duration  = isCrisis ? +(5.5 + Math.random() * 3).toFixed(1) : +(0.5 + Math.random() * 3).toFixed(1);
    const now       = new Date();
    const newVisit  = { id: uid(), time: fmtShort(now), duration, raw: now };

    setVisits((prev) => [...prev.slice(-11), newVisit]);

    // Sensor fluctuation
    setSensors((s) => {
      const ammonia  = +(s.ammonia + (Math.random() * 0.08 - 0.02)).toFixed(2);
      const fan      = ammonia > 0.15;
      const spray    = Math.random() < 0.15;
      const temp     = +(s.temp + (Math.random() * 0.4 - 0.2)).toFixed(1);
      const hum      = Math.min(85, Math.max(35, +(s.hum + (Math.random() * 2 - 1)).toFixed(0)));
      const air      = Math.min(99, Math.max(40, +(s.air + (Math.random() * 4 - 2)).toFixed(0)));
      return { temp, hum, air, ammonia, fan, spray };
    });

    setSensors((s) => {
      // Notification logic
      if (duration > 5) pushNotif("error", `🚨 CRITICAL: Prolonged visit detected — ${duration} min!`);
      else if (duration > 3) pushNotif("warn", `⚠️ Visit slightly extended — ${duration} min`);
      else pushNotif("ok", `✅ Visit completed — ${duration} min (Normal)`);

      if (s.ammonia > 0.15) pushNotif("warn", `🌫️ Ammonia spike detected: ${s.ammonia.toFixed(2)} ppm — fan activated`);
      if (s.spray) pushNotif("error", "💧 ALERT: Rain-sensor triggered (Possible out-of-box urination)");
      return s;
    });

    setTicker((t) => t + 1);
  }, [pushNotif]);

  // Auto-simulate every 8 s
  useEffect(() => {
    const id = setInterval(simulateNewIoTData, 8000);
    return () => clearInterval(id);
  }, [simulateNewIoTData]);

  const freq      = visits.length;
  const lastVisit = visits[visits.length - 1];
  const uti       = lastVisit?.duration > 5 && freq >= 5;
  const kidney    = freq >= 6;

  // กำหนดข้อมูลที่จะแสดงตาม View Mode
  const chartData = viewMode === "today" ? visits : seedWeeklyStats;
  const xDataKey = viewMode === "today" ? "time" : "date";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 lg:p-8"
      style={{ fontFamily: "'DM Sans', 'IBM Plex Sans', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Cat size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Pawsitive Care</h1>
            <p className="text-[11px] text-slate-500 tracking-wider">PREVENTIVE HEALTHCARE HUB</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Wifi size={11} className="text-emerald-400" />
            <span className="text-[11px] text-emerald-400 font-medium">CLOUD SYNC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <button
            onClick={simulateNewIoTData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 transition-colors text-slate-900 text-xs font-bold"
          >
            <Zap size={13} />
            Simulate Alert
          </button>
        </div>
      </header>

      {/* ── 3-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">

        {/* ──────────── LEFT: Sensors ──────────── */}
        <Card className="flex flex-col p-6 gap-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={15} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200 tracking-wide">Environment Panel</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SensorCard icon={Thermometer} label="Temperature" value={sensors.temp} unit="°C"
              accent="#f97316" sub={sensors.temp > 28 ? "⚠️ Elevated" : "Normal range"} />
            <SensorCard icon={Droplets} label="Humidity" value={sensors.hum} unit="%"
              accent="#38bdf8" sub={sensors.hum > 75 ? "⚠️ High moisture" : "Comfortable"} />
          </div>
          <AirPurityBar pct={sensors.air} />

          {/* Medical Diagnosis Hub */}
          <div className="mt-1">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={13} className="text-orange-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Live Medical Diagnosis</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <RiskBadge label="UTI / Stone Risk"
                color={uti ? "#ef4444" : "#10b981"}
                value={uti ? "High Risk" : "Normal"} />
              <RiskBadge label="Kidney / Diabetes"
                color={kidney ? "#f97316" : "#10b981"}
                value={kidney ? "Monitor" : "Normal"} />
              <RiskBadge label="Digestive Status"
                color={sensors.ammonia > 0.15 ? "#f97316" : "#10b981"}
                value={sensors.ammonia > 0.15 ? "NH₃ Spike" : "Healthy"} />
              <RiskBadge label="Daily Frequency"
                color={freq >= 7 ? "#ef4444" : freq >= 5 ? "#f97316" : "#10b981"}
                value={`${freq} visits`} />
            </div>
          </div>

          <DiagnosticsConsole fanActive={sensors.fan} sprayActive={sensors.spray} ammonia={sensors.ammonia} />
        </Card>

        {/* ──────────── MIDDLE: Trends (Hybrid) ──────────── */}
        <Card className="flex flex-col p-6 gap-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200 tracking-wide">Behavioral Trends</h2>
            </div>
            
            {/* Toggle Switch */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/50">
              <button 
                onClick={() => setViewMode("today")} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === "today" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Clock size={12} /> TODAY
              </button>
              <button 
                onClick={() => setViewMode("weekly")} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === "weekly" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Calendar size={12} /> 7 DAYS
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            {[["#10b981","≤3 min Normal"],["#f97316","3–5 min Watch"],["#ef4444",">5 min Risk"]].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="30%"
                onClick={(d) => d?.activePayload && setSelected(d.activePayload[0].payload)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey={xDataKey} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 8]} />
                <Tooltip content={<CustomTooltip viewMode={viewMode} />} cursor={{ fill: "rgba(148,163,184,0.05)" }} />
                <Bar dataKey="duration" radius={[6,6,0,0]} style={{ cursor: "pointer" }}>
                  {chartData.map((v) => (
                    <Cell key={v.id} fill={barColor(v.duration)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Threshold note */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${viewMode === 'weekly' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-red-500/8 border-red-500/20'}`}>
            <AlertTriangle size={12} className={viewMode === 'weekly' ? 'text-orange-400 shrink-0' : 'text-red-400 shrink-0'} />
            <p className="text-[11px] text-slate-400">
              {viewMode === "weekly" 
                ? <><span className="text-orange-400 font-medium">Weekly Insights:</span> Notice the upward trend in duration and frequency starting Mar 30. High risk of FLUTD.</>
                : <>Bars <span className="text-red-400 font-medium">exceeding 5 min</span> indicate elevated UTI risk. <span className="text-slate-500">Tap for details.</span></>}
            </p>
          </div>

          {/* Dynamic Stats row */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              [viewMode === "today" ? "Avg Duration" : "Weekly Avg", `${(chartData.reduce((a,v)=>a+v.duration,0)/chartData.length).toFixed(1)} min`, "#10b981"],
              [viewMode === "today" ? "Max Duration" : "Peak Risk", viewMode === "today" ? `${Math.max(...chartData.map(v=>v.duration)).toFixed(1)} min` : "95%", "#ef4444"],
              [viewMode === "today" ? "Total Visits" : "Total Weekly",  viewMode === "today" ? `${chartData.length}` : `${chartData.reduce((a,v)=>a+v.visitCount,0)}`, "#38bdf8"],
            ].map(([l,v,c]) => (
              <div key={l} className="bg-slate-900/60 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">{l}</p>
                <p className="text-sm font-bold" style={{ color: c }}>{v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ──────────── RIGHT: Live Feed ──────────── */}
        <Card className="flex flex-col p-6 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200 tracking-wide">Silent Alerts Log</h2>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400">{notifs.length} events</span>
            </div>
          </div>

          {/* Alert type legend */}
          <div className="flex gap-3 text-[10px] text-slate-500">
            {[["#ef4444","Critical"],["#f97316","Warning"],["#10b981","OK"],["#38bdf8","Info"]].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>

          {/* Scrollable feed — fixed height */}
          <div ref={notifRef}
            className="flex-1 overflow-y-auto rounded-2xl border border-slate-700/30 bg-slate-900/40"
            style={{ maxHeight: 440, scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>
            <AnimatePresence initial={false}>
              {notifs.map((n) => <NotificationItem key={n.id} n={n} />)}
            </AnimatePresence>
          </div>

          {/* Last visit summary */}
          {lastVisit && (
            <div className="mt-auto bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Last Detection</span>
                <button onClick={() => setSelected(lastVisit)}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                  Details <ChevronRight size={10} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-300">{lastVisit.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart size={12} style={{ color: barColor(lastVisit.duration) }} />
                  <span className="text-xs font-bold" style={{ color: barColor(lastVisit.duration) }}>
                    {lastVisit.duration} min
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-6 text-center text-[10px] text-slate-600 tracking-widest">
        PAWSITIVE CARE v2.0 · ESP32 + MQ135 + DHT22 + RAIN SENSOR · {new Date().toLocaleDateString()}
      </footer>

      {/* ── Modal ── */}
      <AnimatePresence>
        {selected && (
          <VisitModal visit={selected} freq={freq} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}