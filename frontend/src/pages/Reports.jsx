import { useState, useEffect, useRef } from 'react'
import api from '../services/api'

// ── tiny chart helpers ──────────────────────────────────────────────────────
function useChart(ref, type, data, options) {
  useEffect(() => {
    if (!ref.current || !data) return
    let chart
    import('chart.js/auto').then(({ default: Chart }) => {
      if (ref.current._chart) ref.current._chart.destroy()
      chart = new Chart(ref.current, { type, data, options })
      ref.current._chart = chart
    })
    return () => { if (chart) chart.destroy() }
  }, [data]) // eslint-disable-line
}

const COLORS = {
  blue:   'rgba(59,130,246,0.85)',
  green:  'rgba(16,185,129,0.85)',
  amber:  'rgba(245,158,11,0.85)',
  red:    'rgba(239,68,68,0.85)',
  purple: 'rgba(139,92,246,0.85)',
  blueSoft:   'rgba(59,130,246,0.15)',
  greenSoft:  'rgba(16,185,129,0.15)',
}

// ── stat card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = 'blue', sub }) {
  return (
    <div className="card" style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 24px' }}>
      <div style={{
        width:48, height:48, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
        background: `var(--${color === 'blue' ? 'primary' : color === 'green' ? 'success' : color === 'amber' ? 'warning' : 'danger'}-light, rgba(59,130,246,0.12))`,
        fontSize:22,
      }}>
        <i className={`bi ${icon}`} style={{ color: `var(--${color === 'blue' ? 'primary' : color === 'green' ? 'success' : color === 'amber' ? 'warning' : 'danger'})` }}></i>
      </div>
      <div>
        <div style={{ fontSize:'1.6rem', fontWeight:700, lineHeight:1.1 }}>{value ?? '—'}</div>
        <div style={{ fontSize:'0.8rem', color:'var(--gray-400)', marginTop:2 }}>{label}</div>
        {sub && <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [stats, setStats]   = useState(null)
  const [tickets, setTickets] = useState([])
  const [queues, setQueues]  = useState([])
  const [range, setRange]    = useState('today')
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState(null)

  const barRef    = useRef(null)
  const doughRef  = useRef(null)
  const lineRef   = useRef(null)
  const hbarRef   = useRef(null)

  // ── fetch data ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/dashboard/'),
      api.get('/tickets/'),
      api.get('/queues/'),
    ])
      .then(([s, t, q]) => {
        setStats(s.data)
        // DRF may return paginated { count, results:[...] } or a plain array
        setTickets(Array.isArray(t.data) ? t.data : (t.data.results ?? []))
        setQueues(Array.isArray(q.data) ? q.data : (q.data.results ?? []))
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to load report data.')
        setLoading(false)
      })
  }, [range])

  // ── derived metrics ─────────────────────────────────────────────────────
  const completed  = tickets.filter(t => t.status === 'completed').length
  const cancelled  = tickets.filter(t => t.status === 'cancelled').length
  const waiting    = tickets.filter(t => t.status === 'waiting').length
  const serving    = tickets.filter(t => t.status === 'serving').length
  const skipped    = tickets.filter(t => t.status === 'skipped').length
  const totalAll   = tickets.length

  const priorityCounts = ['normal','priority','urgent'].map(p =>
    tickets.filter(t => t.priority === p).length
  )

  // tickets per queue
  const queueTicketCounts = queues.map(q => ({
    name: q.name,
    count: tickets.filter(t => t.queue === q.id).length,
    waiting: tickets.filter(t => t.queue === q.id && t.status === 'waiting').length,
  }))

  // hourly distribution (from created_at)
  const hourBuckets = Array(24).fill(0)
  tickets.forEach(t => {
    if (t.created_at) {
      const h = new Date(t.created_at).getHours()
      hourBuckets[h]++
    }
  })
  const peakHours = hourBuckets.map((c, h) => ({ h, c })).sort((a,b) => b.c - a.c).slice(0,3)

  // ── chart data ──────────────────────────────────────────────────────────
  const statusChartData = {
    labels: ['Waiting','Serving','Completed','Cancelled','Skipped'],
    datasets: [{
      data: [waiting, serving, completed, cancelled, skipped],
      backgroundColor: [COLORS.blue, COLORS.green, COLORS.purple, COLORS.red, COLORS.amber],
      borderWidth: 0,
    }]
  }

  const priorityChartData = {
    labels: queues.map(q => q.name.length > 16 ? q.name.slice(0,14)+'…' : q.name),
    datasets: [
      { label: 'Waiting', data: queueTicketCounts.map(q => q.waiting), backgroundColor: COLORS.blue, borderRadius: 6 },
      { label: 'Total',   data: queueTicketCounts.map(q => q.count),   backgroundColor: COLORS.blueSoft, borderRadius: 6 },
    ]
  }

  const hourlyData = {
    labels: Array.from({length:24}, (_,i) => `${i}:00`),
    datasets: [{
      label: 'Tickets',
      data: hourBuckets,
      fill: true,
      backgroundColor: COLORS.blueSoft,
      borderColor: COLORS.blue,
      tension: 0.4,
      pointRadius: 3,
    }]
  }

  const priorityBreakData = {
    labels: ['Normal','Priority','Urgent'],
    datasets: [{
      label: 'Tickets',
      data: priorityCounts,
      backgroundColor: [COLORS.blue, COLORS.amber, COLORS.red],
      borderRadius: 8,
    }]
  }

  // ── render charts ────────────────────────────────────────────────────────
  useChart(doughRef, 'doughnut', statusChartData, {
    plugins: { legend: { position:'bottom', labels:{ color:'var(--gray-300)', font:{size:12}, boxWidth:12 } } },
    cutout: '70%',
  })
  useChart(barRef, 'bar', priorityChartData, {
    plugins: { legend: { labels:{ color:'var(--gray-300)', font:{size:12} } } },
    scales: {
      x: { ticks:{ color:'var(--gray-400)' }, grid:{ color:'var(--border)' } },
      y: { ticks:{ color:'var(--gray-400)' }, grid:{ color:'var(--border)' } },
    },
    responsive:true,
  })
  useChart(lineRef, 'line', hourlyData, {
    plugins: { legend: { display:false } },
    scales: {
      x: { ticks:{ color:'var(--gray-400)', maxTicksLimit:12 }, grid:{ color:'var(--border)' } },
      y: { ticks:{ color:'var(--gray-400)' }, grid:{ color:'var(--border)' } },
    },
    responsive:true,
  })
  useChart(hbarRef, 'bar', priorityBreakData, {
    indexAxis: 'y',
    plugins: { legend: { display:false } },
    scales: {
      x: { ticks:{ color:'var(--gray-400)' }, grid:{ color:'var(--border)' } },
      y: { ticks:{ color:'var(--gray-400)' }, grid:{ color:'var(--border)' } },
    },
    responsive:true,
  })

  // ── UI ────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page-content" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <span className="spinner"></span>
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="alert alert-danger">{error}</div>
    </div>
  )

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Queue performance overview</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['today','week','month'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`btn ${range === r ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform:'capitalize', padding:'6px 16px', fontSize:'0.85rem' }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:24 }}>
        <StatCard label="Total Tickets"    value={totalAll}                          icon="bi-ticket-perforated-fill" color="blue" />
        <StatCard label="Completed Today"  value={stats?.total_completed_today ?? completed} icon="bi-check-circle-fill"       color="green" />
        <StatCard label="Currently Waiting" value={stats?.total_waiting ?? waiting}  icon="bi-hourglass-split"        color="amber" />
        <StatCard label="Serving Now"       value={stats?.total_serving ?? serving}  icon="bi-person-fill"            color="purple" />
        <StatCard label="Active Queues"     value={queues.filter(q=>q.status==='open').length} icon="bi-collection-fill" color="blue" />
        <StatCard label="Avg Wait (min)"    value={stats?.avg_wait_time ? Number(stats.avg_wait_time).toFixed(1) : '—'} icon="bi-clock-fill" color="amber" />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:16, marginBottom:16 }}>
        {/* Doughnut */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:16 }}>Ticket Status Breakdown</h3>
          <div style={{ position:'relative', maxHeight:260, display:'flex', justifyContent:'center' }}>
            <canvas ref={doughRef}></canvas>
          </div>
          {/* centre label */}
          <div style={{ textAlign:'center', marginTop:8, fontSize:'0.8rem', color:'var(--gray-400)' }}>
            {totalAll} total tickets
          </div>
        </div>

        {/* Bar — tickets per queue */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:16 }}>Tickets per Queue</h3>
          <canvas ref={barRef} style={{ maxHeight:250 }}></canvas>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:24 }}>
        {/* Line — hourly */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:16 }}>Hourly Ticket Distribution</h3>
          <canvas ref={lineRef} style={{ maxHeight:240 }}></canvas>
          {peakHours[0] && (
            <p style={{ fontSize:'0.78rem', color:'var(--gray-400)', marginTop:8 }}>
              Peak hour: <strong style={{ color:'var(--primary)' }}>{peakHours[0].h}:00–{peakHours[0].h+1}:00</strong> ({peakHours[0].c} tickets)
            </p>
          )}
        </div>

        {/* Horizontal bar — priority */}
        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:16 }}>Priority Breakdown</h3>
          <canvas ref={hbarRef} style={{ maxHeight:240 }}></canvas>
        </div>
      </div>

      {/* Queue Summary Table */}
      <div className="card" style={{ padding:24 }}>
        <h3 style={{ fontSize:'0.95rem', fontWeight:600, marginBottom:16 }}>Queue Summary</h3>
        <div style={{ overflowX:'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Status</th>
                <th>Avg Service (min)</th>
                <th>Waiting</th>
                <th>Capacity</th>
                <th>Fill %</th>
              </tr>
            </thead>
            <tbody>
              {queues.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--gray-400)' }}>No queues found</td></tr>
              )}
              {queues.map(q => {
                const pct = Math.min(100, Math.round((q.waiting_count / q.max_capacity) * 100))
                return (
                  <tr key={q.id}>
                    <td style={{ fontWeight:600 }}>{q.name}</td>
                    <td>
                      <span className={`badge badge-${q.status === 'open' ? 'success' : q.status === 'paused' ? 'warning' : 'secondary'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td>{q.avg_service_time}</td>
                    <td>{q.waiting_count}</td>
                    <td>{q.max_capacity}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:3,
                            width:`${pct}%`,
                            background: pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)',
                            transition:'width 0.4s'
                          }}></div>
                        </div>
                        <span style={{ fontSize:'0.78rem', color:'var(--gray-400)', minWidth:32 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}