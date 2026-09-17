'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'

export type Point = { at: string; weightLb: number }
export type Photo = { id: string; at: string; shared: boolean }

/**
 * The progress chart from the design board: a soft green area under a 2px line,
 * no gridlines, no axis furniture. Drawn as plain SVG rather than a charting
 * library so it matches the original exactly and adds nothing to the bundle.
 */
export default function ProgressChart({
  points,
  heightInches,
  goalWeightLb,
  photos = [],
}: {
  points: Point[]
  heightInches?: number | null
  goalWeightLb?: number | null
  /** Progress photographs, newest last. The comp has a Photos tab here. */
  photos?: Photo[]
}) {
  const [tab, setTab] = useState<'weight' | 'bmi' | 'photos'>('weight')

  const series = useMemo(() => {
    if (tab === 'photos') return []
    if (tab === 'weight') return points.map((p) => ({ ...p, value: p.weightLb }))
    if (!heightInches) return []
    return points.map((p) => ({
      ...p,
      value: Math.round(((703 * p.weightLb) / (heightInches * heightInches)) * 10) / 10,
    }))
  }, [points, tab, heightInches])

  const unit = tab === 'weight' ? 'lbs' : ''

  if (tab === 'photos') {
    return (
      <div>
        <Tabs tab={tab} setTab={setTab} hasBmi={Boolean(heightInches)} photoCount={photos.length} />
        {photos.length === 0 ? (
          <div className="ml-sub grid h-[180px] place-items-center rounded-md border border-line bg-[#0a1820] px-6 text-center">
            No progress photographs yet. Add one from{' '}
            <Link href="/documents" className="ml-green ml-1">Documents</Link>.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-2">
              {photos.map((ph) => (
                <figure key={ph.id} className="m-0">
                  <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-[#0a1820]">
                    <Image
                      src={`/api/documents/${ph.id}`}
                      alt={`Progress photograph from ${new Date(ph.at).toLocaleDateString()}`}
                      fill
                      sizes="(max-width: 560px) 45vw, 160px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <figcaption className="ml-sub mt-1.5 text-[11px]">
                    {new Date(ph.at).toLocaleDateString()}
                    {ph.shared ? '' : ' · private'}
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="ml-sub mt-3 text-[11px]">
              Photographs stay private to you unless you share them with your care team.
            </div>
          </>
        )}
      </div>
    )
  }

  if (series.length < 2) {
    return (
      <div>
        <Tabs tab={tab} setTab={setTab} hasBmi={Boolean(heightInches)} photoCount={photos.length} />
        <div className="ml-sub grid h-[180px] place-items-center rounded-md border border-line bg-[#0a1820] text-center">
          {tab === 'bmi' && !heightInches
            ? 'Add your height in a check-in to see BMI.'
            : 'Two check-ins are needed before a trend shows here.'}
        </div>
      </div>
    )
  }

  const W = 500
  const H = 170
  const PAD = 10

  const values = series.map((s) => s.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat series would divide by zero and a tiny range makes noise look dramatic.
  const range = Math.max(max - min, 1)
  const lo = min - range * 0.25
  const hi = max + range * 0.25

  const x = (i: number) => PAD + (i / (series.length - 1)) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo)) * (H - PAD * 2)

  const line = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(s.value).toFixed(1)}`).join(' ')
  const area = `${line} L ${x(series.length - 1).toFixed(1)} ${H} L ${x(0).toFixed(1)} ${H} Z`

  const first = series[0].value
  const last = series[series.length - 1].value
  const delta = Math.round((last - first) * 10) / 10

  return (
    <div>
      <Tabs tab={tab} setTab={setTab} hasBmi={Boolean(heightInches)} photoCount={photos.length} />

      <div className="mb-2 flex items-baseline gap-3">
        <div className="text-2xl font-bold">
          {last}
          <span className="ml-sub ml-1.5 text-[13px]">{unit}</span>
        </div>
        <div className={`text-[13px] ${delta <= 0 ? 'ml-green' : 'ml-danger'}`}>
          {delta <= 0 ? '↓' : '↑'} {Math.abs(delta)} {unit} since first check-in
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[170px] w-full border-b border-[#1d3740]"
          role="img"
          aria-label={`${tab === 'weight' ? 'Weight' : 'BMI'} trend, ${series.length} readings, latest ${last} ${unit}`}
        >
          <defs>
            <linearGradient id="ml-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#58edb5" stopOpacity=".25" />
              <stop offset="1" stopColor="#58edb5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {goalWeightLb && tab === 'weight' && goalWeightLb > lo && goalWeightLb < hi ? (
            <line
              x1={PAD}
              x2={W - PAD}
              y1={y(goalWeightLb)}
              y2={y(goalWeightLb)}
              stroke="#3d5a64"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ) : null}

          <path d={area} fill="url(#ml-area)" />
          <path d={line} fill="none" stroke="#58edb5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="ml-sub mt-2 flex justify-between text-[11px]">
        <span>{new Date(series[0].at).toLocaleDateString()}</span>
        {goalWeightLb && tab === 'weight' ? <span>goal {goalWeightLb} lbs</span> : null}
        <span>{new Date(series[series.length - 1].at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function Tabs({
  tab,
  setTab,
  hasBmi,
  photoCount,
}: {
  tab: 'weight' | 'bmi' | 'photos'
  setTab: (t: 'weight' | 'bmi' | 'photos') => void
  hasBmi: boolean
  photoCount: number
}) {
  return (
    <div className="ml-tabs">
      <button className={`ml-tab ${tab === 'weight' ? 'is-on' : ''}`} onClick={() => setTab('weight')}>
        Weight
      </button>
      <button
        className={`ml-tab ${tab === 'bmi' ? 'is-on' : ''}`}
        onClick={() => setTab('bmi')}
        disabled={!hasBmi}
        title={hasBmi ? undefined : 'Height not on file yet'}
      >
        BMI
      </button>
      <button className={`ml-tab ${tab === 'photos' ? 'is-on' : ''}`} onClick={() => setTab('photos')}>
        Photos{photoCount ? ` (${photoCount})` : ''}
      </button>
    </div>
  )
}
