import React, { useState, useRef } from 'react'
import { UPLOADS_URL } from '../api/index.js'

export default function ImageUpload({ label, currentImage, onUpload, multiple = false }) {
  const [previews, setPreviews] = useState([])
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setPreviews(newPreviews)

    if (multiple) {
      onUpload(files)
    } else {
      onUpload(files[0])
    }
  }

  const currentImageUrl =
    currentImage && !currentImage.startsWith('blob:') && !currentImage.startsWith('http')
      ? `${UPLOADS_URL}/${currentImage}`
      : currentImage

  return (
    <div className="space-y-2">
      {label && <label className="form-label">{label}</label>}

      {/* Current image(s) or new previews */}
      {previews.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-24 h-24 object-cover rounded border border-gray-300"
              />
              <span className="absolute top-0.5 right-0.5 bg-green-500 text-white text-xs px-1 rounded">New</span>
            </div>
          ))}
        </div>
      ) : currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImageUrl}
            alt="Current"
            className="w-24 h-24 object-cover rounded border border-gray-300"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span className="absolute top-0.5 right-0.5 bg-gray-500 text-white text-xs px-1 rounded">Current</span>
        </div>
      ) : null}

      {/* Upload button */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gold transition-colors duration-150"
        onClick={() => inputRef.current?.click()}
      >
        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <p className="text-sm text-gray-500">
          {multiple ? 'Click to upload images' : 'Click to upload image'}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  )
}
