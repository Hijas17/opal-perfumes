import React, { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { uploadMedia, UPLOADS_URL } from '../api/index.js'

/**
 * Single image field that uploads to the shared media library and hands the
 * saved FILENAME back via onChange.
 *
 * Differs from Settings' ImageSettingField, which writes straight to one
 * setting key: this one is value-controlled, so it works inside repeatable
 * rows (hero slides, tiles) where the image is one property of a larger object
 * that gets saved with the rest of the form.
 */
export default function MediaField({ label, value, onChange, hint, className = '' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const previewUrl =
    value && !value.startsWith('http') ? `${UPLOADS_URL}/${value}` : value

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await uploadMedia(formData)
      const name = res.data?.data?.name
      if (!name) throw new Error('Upload returned no filename.')
      onChange(name)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      {label && <label className="form-label mb-1.5 block">{label}</label>}

      {value ? (
        <div className="relative mb-2 inline-block">
          <img
            src={previewUrl}
            alt=""
            className="h-24 w-40 rounded border border-border object-cover"
            onError={(e) => { e.target.style.visibility = 'hidden' }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            title="Remove image"
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white shadow"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div
        className="cursor-pointer rounded-lg border-2 border-dashed border-border p-3 text-center transition-colors duration-150 hover:border-gold"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-xs text-muted-foreground">
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Click to upload'} · JPG, PNG, WEBP
        </p>
      </div>

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
