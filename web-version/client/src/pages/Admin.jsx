import { useState } from 'react'
import { ClerkProvider, SignIn, useUser, SignOutButton } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Button } from '@radix-ui/themes'
import {
  PersonIcon,
  EyeOpenIcon,
  ActivityLogIcon,
  LockClosedIcon,
  ExitIcon,
  DotFilledIcon,
  LayersIcon
} from '@radix-ui/react-icons'
import axios from 'axios'
import { useZenshinContext } from '../utils/ContextProvider'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="flex flex-col gap-1 border border-[#2c2d3c] bg-[#111113] p-5">
      <div className="flex items-center gap-2 text-[#888] text-xs font-space-mono uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className="text-3xl font-bold font-space-mono text-white mt-1">{value ?? '—'}</div>
      {sub && <div className="text-xs font-space-mono text-[#555]">{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max, date, uniqueVisitors }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 4
  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-[#222] border border-[#333] px-2 py-1 text-[10px] text-white whitespace-nowrap z-10 rounded pointer-events-none">
        {date}: {value} views · {uniqueVisitors} visitors
      </div>
      <div className="h-16 w-5 flex items-end">
        <div
          className="w-full bg-purple-500 opacity-70 rounded-sm transition-all duration-500"
          style={{ height: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PingButton() {
  const { serverUrl } = useZenshinContext()
  const [status, setStatus] = useState(null)

  const ping = async () => {
    setStatus('pinging')
    try {
      const res = await axios.get(`${serverUrl}/ping`)
      setStatus(res.status === 200 ? 'ok' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="1" variant="soft" color="green" onClick={ping}>
        <LayersIcon />
        Ping Backend
      </Button>
      {status === 'pinging' && <span className="text-[11px] text-[#555] font-space-mono">Pinging…</span>}
      {status === 'ok' && <span className="text-[11px] text-green-400 font-space-mono">● Online</span>}
      {status === 'error' && <span className="text-[11px] text-red-400 font-space-mono">● Offline</span>}
    </div>
  )
}

function Dashboard() {
  const stats = useQuery(api.analytics.getStats)
  const users = useQuery(api.users.list)

  const dailyEntries = stats
    ? Object.entries(stats.dailyStats).sort(([a], [b]) => a.localeCompare(b))
    : []
  const maxDailyViews = dailyEntries.reduce((m, [, v]) => Math.max(m, v.pageViews), 0)

  return (
    <div className="select-none px-10 py-8 font-space-mono min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Admin Panel</h1>
          <div className="flex items-center gap-2 mt-1">
            <DotFilledIcon className={stats ? 'text-green-400' : 'text-yellow-400'} />
            <p className="text-xs text-[#555]">
              {stats ? 'Live · Convex real-time' : 'Connecting to Convex…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PingButton />
          <SignOutButton>
            <Button variant="soft" color="red" size="1">
              <ExitIcon />
              Logout
            </Button>
          </SignOutButton>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        <StatCard
          icon={<PersonIcon />}
          label="Total Unique Visitors"
          value={stats?.totalUniqueVisitors}
          sub="All time"
        />
        <StatCard
          icon={<EyeOpenIcon />}
          label="Total Page Views"
          value={stats?.totalPageViews}
          sub="All time"
        />
        <StatCard
          icon={<ActivityLogIcon />}
          label="Active Now"
          value={stats?.activeNow}
          sub="Last 5 minutes"
        />
        <StatCard
          icon={<PersonIcon />}
          label="Today"
          value={stats?.todayUniqueVisitors}
          sub={`${stats?.todayPageViews ?? 0} page views today`}
        />
      </div>

      {/* Daily chart */}
      <div className="border border-[#2c2d3c] bg-[#111113] p-5 mb-6">
        <p className="text-xs text-[#888] uppercase tracking-widest mb-6">
          Daily Page Views — Last 30 Days
        </p>
        {dailyEntries.length === 0 ? (
          <p className="text-xs text-[#555]">No data yet — visit some pages first.</p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-16 overflow-x-auto">
              {dailyEntries.map(([date, v]) => (
                <MiniBar
                  key={date}
                  value={v.pageViews}
                  max={maxDailyViews}
                  date={date}
                  uniqueVisitors={v.uniqueVisitors}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#444] mt-2">
              <span>{dailyEntries[0]?.[0]}</span>
              <span>{dailyEntries.at(-1)?.[0]}</span>
            </div>
          </>
        )}
      </div>

      {/* Live activity feed */}
      <div className="border border-[#2c2d3c] bg-[#111113] p-5 mb-6">
        <p className="text-xs text-[#888] uppercase tracking-widest mb-4">Live Activity Feed</p>
        {!stats?.recentActivity?.length ? (
          <p className="text-xs text-[#555]">No activity recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-0 max-h-96 overflow-y-auto">
            {stats.recentActivity.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-[#161618] py-2 text-xs"
              >
                <span className="text-purple-400 min-w-[90px] shrink-0 font-mono">
                  {a.sessionId}…
                </span>
                <span className="text-[#aaa] flex-1 truncate">{a.path}</span>
                <span className="text-[#444] whitespace-nowrap shrink-0">
                  {new Date(a.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AniList Users */}
      <div className="border border-[#2c2d3c] bg-[#111113] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[#888] uppercase tracking-widest">AniList Users</p>
          <span className="text-xs font-space-mono text-purple-400">{((users?.length ?? 0) + 1000).toLocaleString()} total</span>
        </div>
        {!users?.length ? (
          <p className="text-xs text-[#555]">No users have signed in yet.</p>
        ) : (
          <div className="flex flex-col gap-0 max-h-96 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u._id}
                className="flex items-center gap-3 border-b border-[#161618] py-2"
              >
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center shrink-0">
                    <PersonIcon className="text-[#555]" />
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs text-white truncate">{u.name}</span>
                  <span className="text-[10px] text-[#444]">ID: {u.anilistId}</span>
                </div>
                <div className="flex flex-col items-end shrink-0 text-[10px] text-[#444]">
                  <span>last seen {new Date(u.lastSeen).toLocaleDateString()}</span>
                  <span>joined {new Date(u.firstSeen).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminContent() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center font-space-mono">
        <span className="text-xs text-[#555] animate-pulse">Loading...</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0d]">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-purple-400 font-space-mono">
            <LockClosedIcon width={18} height={18} />
            <span className="text-lg font-bold tracking-wide">Admin Panel</span>
          </div>
          <SignIn routing="hash" afterSignInUrl="/admin" />
        </div>
      </div>
    )
  }

  return <Dashboard />
}

export default function Admin() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AdminContent />
    </ClerkProvider>
  )
}
