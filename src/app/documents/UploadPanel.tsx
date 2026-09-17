'use client'

import { useActionState, useRef, useState } from 'react'
import { uploadDocument, type UploadState } from '@/actions/documents'
import { FormError, SubmitButton } from '@/components/ui'

export default function UploadPanel() {
  const [state, action] = useActionState<UploadState, FormData>(uploadDocument, {})
  const [kind, setKind] = useState('LAB_RESULT')
  const [filename, setFilename] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <section className="ml-card self-start">
      <div className="ml-card-title">Upload a Document</div>
      <form action={action} className="p-5">
        <div
          className={`ml-upload ${dragging ? 'is-drag' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file && inputRef.current) {
              const dt = new DataTransfer()
              dt.items.add(file)
              inputRef.current.files = dt.files
              setFilename(file.name)
            }
          }}
        >
          <div>
            <div className="ml-green text-[27px]">☁</div>
            <b>{filename ?? 'Upload Documents'}</b>
            <br />
            <span className="ml-sub">
              Drag and drop a file here, or click to browse
              <br />
              PDF, JPG, PNG (max 10MB each)
            </span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          name="file"
          className="sr-only"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
          required
        />

        <div className="ml-field">
          <label htmlFor="kind">What is this?</label>
          <select
            id="kind"
            name="kind"
            className="ml-input"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="LAB_RESULT">Lab result</option>
            <option value="ID_DOCUMENT">Identification</option>
            <option value="PROGRESS_PHOTO">Progress photo</option>
            <option value="OTHER">Something else</option>
          </select>
        </div>

        {kind === 'PROGRESS_PHOTO' ? (
          <>
            <label className="ml-check mt-3">
              <input type="checkbox" name="share" className="sr-only" />
              <span className="ml-box" />
              Share this photo with my care team
            </label>
            <div className="ml-sub text-[11px]">
              Progress photographs stay private unless you tick this. You can change it later.
            </div>
          </>
        ) : null}

        <FormError message={state.error} />
        {state.ok ? <div className="ml-green mt-3 text-[13px]">{state.ok}</div> : null}

        <div className="mt-4">
          <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
        </div>
      </form>
    </section>
  )
}
