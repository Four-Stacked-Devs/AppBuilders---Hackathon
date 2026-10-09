import { useEffect, useState } from 'react'
import {
  Activity,
  ChartNoAxesColumnIncreasing,
  Droplet,
  Flame,
  Lightbulb,
  Moon,
  Utensils
} from 'lucide-react'
import { addDays, canGoNext, localDate, periodRange, shiftPeriod, type Period } from '@shared/dates'
import { summarizeRange } from '@shared/calc'
import type { DaySummary } from '@shared/schemas'
import { useVox } from '../store'
import { greeting, longDate, monthLabel, shortDate, shortDay } from '../format'
import { useTokens } from '../useTokens'
import { Banner } from '../components/Banner'
import { BarCard, type BarPoint } from '../components/BarCard'
import { LoggedList } from '../components/LoggedList'
import { PlansPanel } from '../components/PlansPanel'
import { usePlans } from '../usePlans'
import { COMEBACK_TEXT } from '@shared/insights/copy'
import { PeriodNav } from '../components/PeriodNav'
import { StatCard } from '../components/StatCard'
import { StreakCard } from '../components/StreakCard'
import { WeightChart } from '../components/WeightChart'

type Tab = 'today' | 'weekly' | 'monthly'
const PERIOD: Record<Tab, Period> = { today: 'day', weekly: 'week', monthly: 'month' }
const TITLE: Record<Tab, string> = { today: 'Today', weekly: 'Weekly', monthly: 'Monthly' }

// Every day in the period, oldest first; days after today are listed with no value.
function allDays(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const dash = (n: number | null, f: (n: number) => string = String): string =>
  n === null ? '—' : f(n)

export function Dashboard({ tab }: { tab: Tab }): React.JSX.Element {
  const { profile, setScreen } = useVox()
  const t = useTokens()
  const today = localDate()
  const period = PERIOD[tab]
  const [anchor, setAnchor] = useState(today)
  // Data is tagged with the range it was fetched for, so a new period never shows old numbers.
  const [loaded, setLoaded] = useState<{ key: string; days: DaySummary[] } | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [planTick, setPlanTick] = useState(0)
  const plans = usePlans(planTick)
  const range = periodRange(period, anchor)
  const to = range.to > today ? today : range.to

  const days = loaded?.key === `${range.from}|${to}` ? loaded.days : null

  useEffect(() => {
    let alive = true
    window.vox.history
      .range(range.from, to)
      .then((d) => alive && setLoaded({ key: `${range.from}|${to}`, days: d }))
    return () => {
      alive = false
    }
  }, [range.from, to])

  const adult = profile?.mode !== 'teen'
  const energy = adult && profile?.caloriesEnabled === true
  const byDate = new Map((days ?? []).map((d) => [d.date, d]))
  const series = (pick: (d: DaySummary) => number): BarPoint[] =>
    allDays(range.from, range.to).map((date) => ({
      label: period === 'week' ? shortDay(date) : String(Number(date.slice(8))),
      value: byDate.has(date) ? pick(byDate.get(date) as DaySummary) : null
    }))
  const sum = summarizeRange(days ?? [])
  const demo = (days ?? []).some((d) => d.includesDemoData)

  const isCurrent = range.from <= today && today <= range.to
  const label =
    period === 'day'
      ? isCurrent
        ? 'Today'
        : shortDate(anchor)
      : period === 'week'
        ? isCurrent
          ? 'This Week'
          : `${shortDate(range.from)} – ${shortDate(range.to)}`
        : isCurrent
          ? 'This Month'
          : monthLabel(anchor)
  const subtitle =
    period === 'day'
      ? longDate(anchor)
      : period === 'week'
        ? `${shortDate(range.from)} – ${shortDate(range.to)}, ${range.to.slice(0, 4)}`
        : monthLabel(anchor)

  const refresh = async (): Promise<void> =>
    setLoaded({
      key: `${range.from}|${to}`,
      days: await window.vox.history.range(range.from, to)
    })

  const seed = async (): Promise<void> => {
    setSeeding(true)
    try {
      await window.vox.dev.seed()
      await refresh()
    } finally {
      setSeeding(false)
    }
  }

  const bars = (compact: boolean): React.JSX.Element => (
    <div className={compact ? 'grid-4' : 'grid-2'}>
      <BarCard
        icon={Activity}
        title="Active minutes"
        value={String(sum.activeMinutes)}
        unit="min total"
        data={series((d) => d.activeMinutes)}
        color={t.primary}
        compact={compact}
      />
      {energy && (
        <BarCard
          icon={Utensils}
          title="Nutrition"
          value={dash(sum.avgKcalIn, (n) => `~${n}`)}
          unit="avg kcal eaten, estimate"
          data={series((d) => d.kcalIn ?? 0)}
          color={t.primary}
          compact={compact}
        />
      )}
      <BarCard
        icon={Moon}
        title="Sleep"
        value={dash(sum.avgSleepHours, (n) => `${n} h`)}
        unit="avg per night"
        data={series((d) => d.sleepHours)}
        color={t.sleep}
        compact={compact}
      />
      <BarCard
        icon={Droplet}
        title="Hydration"
        value={dash(sum.avgWaterGlasses)}
        unit="glasses avg per day"
        data={series((d) => d.waterGlasses)}
        color={t.water}
        compact={compact}
      />
    </div>
  )

  const day = days?.[0]

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{TITLE[tab]}</h1>
          <p className="sub">
            {subtitle}
            {demo && ' · Includes demo data'}
          </p>
        </div>
        <PeriodNav
          label={label}
          onPrev={() => setAnchor(shiftPeriod(period, anchor, -1))}
          onNext={() => setAnchor(shiftPeriod(period, anchor, 1))}
          nextDisabled={!canGoNext(period, anchor, today)}
        />
      </div>
      <div className="tabs" role="tablist">
        {(['today', 'weekly', 'monthly'] as Tab[]).map((x) => (
          <button
            key={x}
            role="tab"
            className="tab"
            aria-selected={tab === x}
            onClick={() => setScreen(x)}
          >
            {TITLE[x]}
          </button>
        ))}
      </div>

      {days === null ? (
        <p className="muted">Loading…</p>
      ) : tab === 'today' ? (
        day && (
          <>
            {anchor === today && (
              <Banner
                icon={Flame}
                title={`${greeting(new Date().getHours())}, ${profile?.nickname}!`}
              >
                {plans?.comeback && day.entryCount === 0
                  ? COMEBACK_TEXT
                  : day.entryCount > 0
                    ? 'Here’s what you’ve logged today.'
                    : 'Nothing logged yet today. Tell VOX what you did.'}
              </Banner>
            )}
            <div className="stats">
              {anchor === today && <StreakCard refreshKey={loaded} />}
              {energy && day.kcalIn !== undefined && (
                <StatCard icon={Flame} value={`~${day.kcalIn}`} label="kcal eaten, estimate" />
              )}
              <StatCard icon={Activity} value={day.activeMinutes} label="active minutes" />
              <StatCard
                icon={Droplet}
                value={day.waterGlasses}
                label="glasses of water"
                tone="water"
              />
              <StatCard icon={Moon} value={day.sleepHours} label="hours of sleep" tone="sleep" />
            </div>
            {energy && day.kcalOut !== undefined && (
              <p className="note">
                ~{day.kcalOut} kcal from exercise, estimate.
                {day.tdee !== undefined &&
                  ` Your body uses around ${day.tdee} kcal on a typical day (Mifflin–St Jeor estimate).`}
              </p>
            )}
            {day.latestReaction && (
              <section className="insight" style={{ marginTop: '1rem' }}>
                <h3>
                  <Lightbulb size={18} aria-hidden="true" />
                  VOX Insight
                </h3>
                <p>{day.latestReaction.text}</p>
              </section>
            )}
            {anchor === today && plans && (
              <PlansPanel plans={plans} onChanged={() => setPlanTick((n) => n + 1)} />
            )}
            <LoggedList
              date={anchor}
              title={anchor === today ? 'Logged today' : `Logged on ${shortDate(anchor)}`}
              showWeight={adult}
              onChanged={() => {
                void refresh()
                setPlanTick((n) => n + 1)
              }}
            />
          </>
        )
      ) : tab === 'weekly' ? (
        <>
          <Banner kicker="Weekly Recap" icon={ChartNoAxesColumnIncreasing} title="Your week">
            You logged on {sum.daysLogged} of {sum.days} days, with {sum.activeMinutes} active
            minutes.
          </Banner>
          {bars(false)}
        </>
      ) : (
        <>
          <Banner
            kicker="Monthly Summary"
            icon={ChartNoAxesColumnIncreasing}
            title={`Your month, ${profile?.nickname}.`}
          >
            You logged on {sum.daysLogged} of {sum.days} days, with {sum.activeMinutes} active
            minutes.
          </Banner>
          <div className="stack">
            {adult && <WeightChart days={days} />}
            {bars(true)}
          </div>
        </>
      )}

      {import.meta.env.DEV && (
        <p className="note">
          Dev tool:{' '}
          <button className="link" disabled={seeding} onClick={seed}>
            {seeding ? 'Adding demo history…' : 'Add 3 weeks of labelled demo history'}
          </button>
        </p>
      )}
    </div>
  )
}
