'use client'

import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { updateBenefitTagsAction } from './actions'
import { CATEGORY_OPTIONS, SITUATION_OPTIONS, WIZARD_STAGE_OPTIONS } from './constants'

// updateBenefitTagsAction has no return value; useFormState needs the wrapped action to
// return the next state, so this just runs it and reports a fresh timestamp on success.
// Wiring the raw FormData through a hand-rolled client wrapper (calling the server action
// directly inside an onSubmit-style handler) silently dropped every checkbox value on the
// server side -- useFormState is the pattern Next.js actually supports for reading the
// native form submission's FormData intact, so this goes through it instead.
async function submitTags(_prevState: number, formData: FormData) {
  await updateBenefitTagsAction(formData)
  return Date.now()
}

export default function TagsForm({ benefit }: { benefit: Record<string, any> }) {
  const [savedAt, formAction] = useFormState(submitTags, 0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (savedAt === 0) return
    setSaved(true)
    const timer = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [savedAt])

  return (
    <form action={formAction} className="relative mt-3 flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="id" value={benefit.id} />
      <select name="category" defaultValue={benefit.category} className="rounded border px-2 py-1">
        {CATEGORY_OPTIONS.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      {WIZARD_STAGE_OPTIONS.map((stage, i) => {
        const checked = (benefit.wizard_stages ?? '').split(',').includes(stage)
        return (
          <label key={stage} className="flex items-center gap-1">
            {/* name must stay ASCII-only: a Korean field name gets mangled by the multipart
                form parser (each UTF-8 byte decoded as a separate Latin-1 char), even though
                Korean field VALUES round-trip fine. Index into the options array instead. */}
            <input type="checkbox" name={`stage_${i}`} defaultChecked={checked} />
            {stage}
          </label>
        )
      })}
      <span className="mx-1 text-slate-300">|</span>
      {SITUATION_OPTIONS.map((situation, i) => {
        const checked = (benefit.special_situations ?? '').split(',').includes(situation)
        return (
          <label key={situation} className="flex items-center gap-1">
            <input type="checkbox" name={`situation_${i}`} defaultChecked={checked} />
            {situation}
          </label>
        )
      })}
      <button type="submit" className="rounded bg-indigo-700 px-3 py-1 text-white">
        분류 저장
      </button>
      {saved && (
        <span className="absolute -top-8 left-0 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white shadow">
          저장 완료 ✓
        </span>
      )}
    </form>
  )
}
