'use client'

import { AvailabilityRule } from '@/lib/apiClient'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface WeeklyScheduleGridProps {
  rules: AvailabilityRule[]
  compact?: boolean
  onDeleteRule?: (ruleId: string) => void
}

export function WeeklyScheduleGrid({ rules, compact = false, onDeleteRule }: WeeklyScheduleGridProps) {
  return (
    <div
      role="grid"
      aria-label="Weekly availability calendar"
      className={`grid grid-cols-7 gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {DAY_LABELS.map((label, dayIndex) => {
        const dayRules = rules.filter((r) => r.day_of_week === dayIndex)
        return (
          <div key={label} role="columnheader" className="flex flex-col">
            <div
              className={`text-center font-semibold uppercase tracking-wide text-muted mb-2 ${
                compact ? 'text-[10px]' : 'text-xs'
              }`}
            >
              {label}
            </div>
            <div
              role="gridcell"
              className={`flex-1 bg-surface border border-border rounded-lg ${
                compact ? 'min-h-[72px] p-1.5' : 'min-h-[100px] p-2'
              }`}
            >
              {dayRules.length === 0 ? (
                <span className="text-[10px] text-muted/60 block text-center pt-2">—</span>
              ) : (
                <div className="space-y-1">
                  {dayRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`bg-blue/10 border border-blue/20 rounded px-1.5 py-1 font-mono text-blue ${
                        compact ? 'text-[9px]' : 'text-[10px]'
                      }`}
                    >
                      <div>
                        {rule.start_time}–{rule.end_time}
                      </div>
                      {onDeleteRule && (
                        <button
                          type="button"
                          onClick={() => onDeleteRule(rule.id)}
                          className="text-[9px] text-warn hover:underline mt-0.5"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
