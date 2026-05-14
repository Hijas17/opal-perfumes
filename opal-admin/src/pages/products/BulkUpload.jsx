import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { bulkImportProducts, getAdminCategories } from '../../api/index.js'

// ── Column definitions ────────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'name',                  label: 'name *',                required: true  },
  { key: 'subcategory',           label: 'subcategory *',         required: true  },
  { key: 'short_description',     label: 'short_description',     required: false },
  { key: 'full_description',      label: 'full_description',      required: false },
  { key: 'price',                 label: 'price',                 required: false },
  { key: 'currency',              label: 'currency',              required: false },
  { key: 'size_volume',           label: 'size_volume',           required: false },
  { key: 'label',                 label: 'label',                 required: false },
  { key: 'is_featured',           label: 'is_featured',           required: false },
  { key: 'status',                label: 'status',                required: false },
  { key: 'primary_image_url',     label: 'primary_image_url',     required: false },
  { key: 'hover_image_url',       label: 'hover_image_url',       required: false },
  { key: 'ingredients_image_url', label: 'ingredients_image_url', required: false },
  { key: 'gallery_image_urls',    label: 'gallery_image_urls',    required: false },
  { key: 'purchase_links',        label: 'purchase_links',        required: false },
  { key: 'top_notes',             label: 'top_notes',             required: false },
  { key: 'middle_notes',          label: 'middle_notes',          required: false },
  { key: 'base_notes',            label: 'base_notes',            required: false },
  { key: 'display_order',         label: 'display_order',         required: false },
]

const SAMPLE_ROWS = [
  {
    name:                  'Amber Oud',
    subcategory:           'Perfume',
    short_description:     'A rich blend of amber and oud',
    full_description:      'Our signature Amber Oud is a timeless fragrance...',
    price:                 220,
    currency:              'AED',
    size_volume:           '100ml',
    label:                 'bestseller',
    is_featured:           'TRUE',
    status:                'published',
    primary_image_url:     'https://drive.google.com/uc?id=YOUR_FILE_ID',
    hover_image_url:       'https://drive.google.com/uc?id=YOUR_FILE_ID',
    ingredients_image_url: '',
    gallery_image_urls:    '',
    purchase_links:        '[{"platform":"Noon","url":"https://www.noon.com/your-product"}]',
    top_notes:             'Bergamot, Saffron',
    middle_notes:          'Rose, Oud',
    base_notes:            'Amber, Musk',
    display_order:         1,
  },
  {
    name:                  'Desert Buhoor',
    subcategory:           'Buhoor',
    short_description:     'Traditional buhoor with a modern twist',
    full_description:      '',
    price:                 85,
    currency:              'AED',
    size_volume:           '50g',
    label:                 'new',
    is_featured:           'FALSE',
    status:                'draft',
    primary_image_url:     '',
    hover_image_url:       '',
    ingredients_image_url: '',
    gallery_image_urls:    '',
    purchase_links:        '',
    top_notes:             '',
    middle_notes:          '',
    base_notes:            '',
    display_order:         2,
  },
]

// ── Client-side validation ────────────────────────────────────────────────────
const VALID_LABELS     = ['', 'none', 'new', 'bestseller', 'limited', 'featured']
const VALID_STATUSES   = ['', 'published', 'draft']
const VALID_CURRENCIES = ['AED', 'USD', 'SAR', 'KWD', 'OMR', 'BHD', 'QAR', 'GBP', 'EUR']

function isValidUrl(str) {
  if (!str) return true
  try { new URL(str); return true } catch { return false }
}

function validateRow(row, existingNames, categories) {
  const errors = []
  const name = String(row.name ?? '').trim()

  if (!name) errors.push('name is required')
  const sub = String(row.subcategory ?? '').trim().toLowerCase()
  if (!sub) {
    errors.push('subcategory is required')
  } else if (categories.length > 0 && !categories.map(c => c.name.toLowerCase()).includes(sub)) {
    errors.push(`subcategory "${row.subcategory}" not found`)
  }

  if (existingNames.has(name.toLowerCase())) errors.push(`duplicate name within this file`)

  if (row.price !== '' && row.price !== undefined && row.price !== null) {
    if (isNaN(Number(row.price))) errors.push('price must be a number')
    else if (Number(row.price) < 0) errors.push('price cannot be negative')
  }

  const label = String(row.label ?? '').trim().toLowerCase()
  if (label && !VALID_LABELS.includes(label)) errors.push(`label must be one of: none, new, bestseller, limited, featured`)

  const status = String(row.status ?? '').trim().toLowerCase()
  if (status && !VALID_STATUSES.includes(status)) errors.push(`status must be published or draft`)

  const currency = String(row.currency ?? '').trim().toUpperCase()
  if (currency && !VALID_CURRENCIES.includes(currency)) errors.push(`unrecognised currency "${currency}" — will default to AED`)

  ;['primary_image_url', 'hover_image_url', 'ingredients_image_url'].forEach(f => {
    if (row[f] && !isValidUrl(row[f])) errors.push(`${f} is not a valid URL`)
  })

  if (row.gallery_image_urls) {
    String(row.gallery_image_urls).split(',').map(s => s.trim()).filter(Boolean).forEach(u => {
      if (!isValidUrl(u)) errors.push(`Gallery URL "${u}" is not valid`)
    })
  }

  if (row.purchase_links) {
    try {
      const pl = JSON.parse(row.purchase_links)
      if (!Array.isArray(pl)) errors.push('purchase_links must be a JSON array')
      else pl.forEach(l => {
        if (!l.platform || !l.url) errors.push('Each purchase link needs platform and url')
        else if (!isValidUrl(l.url)) errors.push(`Purchase link URL "${l.url}" is invalid`)
      })
    } catch {
      errors.push('purchase_links is not valid JSON')
    }
  }

  if (row.display_order !== '' && row.display_order !== undefined && row.display_order !== null) {
    if (isNaN(Number(row.display_order)) || !Number.isInteger(Number(row.display_order))) {
      errors.push('display_order must be a whole number')
    }
  }

  return errors
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BulkUpload() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [parsedRows,   setParsedRows]   = useState([])
  const [rowErrors,    setRowErrors]    = useState([])
  const [categories,   setCategories]   = useState([])
  const [isDragging,   setIsDragging]   = useState(false)
  const [fileName,     setFileName]     = useState('')
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [globalError,  setGlobalError]  = useState('')

  // Load categories once for client-side validation hints
  React.useEffect(() => {
    getAdminCategories()
      .then(res => setCategories(res.data?.data || []))
      .catch(() => {})
  }, [])

  // ── Download template ───────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: COLUMNS.map(c => c.key) })

    // Style header row with bold (xlsx community edition doesn't support full styles
    // but we set column widths for readability)
    ws['!cols'] = COLUMNS.map(col => ({
      wch: Math.max(col.key.length + 2, 18),
    }))

    // Add a notes row below the sample data
    const notes = {
      name: '* = required',
      subcategory: 'Must match an existing category (e.g. Perfume, Buhoor)',
      label: 'none | new | bestseller | limited | featured',
      is_featured: 'TRUE or FALSE',
      status: 'published | draft',
      currency: 'AED | USD | SAR | KWD | OMR | BHD | QAR | GBP | EUR',
      primary_image_url: 'Google Drive: https://drive.google.com/uc?id=FILE_ID',
      gallery_image_urls: 'Comma-separated URLs',
      purchase_links: '[{"platform":"Noon","url":"https://..."}]',
      display_order: 'Integer (lower = first)',
    }
    XLSX.utils.sheet_add_json(ws, [notes], { header: COLUMNS.map(c => c.key), skipHeader: true, origin: -1 })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Products')
    XLSX.writeFile(wb, 'opal_products_template.xlsx')
  }

  // ── Parse uploaded file ─────────────────────────────────────────────────────
  const parseFile = useCallback((file) => {
    if (!file) return
    setFileName(file.name)
    setImportResult(null)
    setGlobalError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rows.length === 0) {
          setGlobalError('The file appears to be empty.')
          setParsedRows([])
          return
        }
        if (rows.length > 500) {
          setGlobalError('Maximum 500 rows per upload. Please split into smaller files.')
          setParsedRows([])
          return
        }

        // Track names within file for intra-file duplicate detection
        const seenNames = new Map()
        const errors = rows.map((row, idx) => {
          const name = String(row.name ?? '').trim().toLowerCase()
          const existingNamesSet = new Set(
            [...seenNames.entries()].filter(([k, v]) => v < idx).map(([k]) => k)
          )
          seenNames.set(name, idx)
          return validateRow(row, existingNamesSet, categories)
        })

        setParsedRows(rows)
        setRowErrors(errors)
      } catch (err) {
        setGlobalError('Could not parse the file. Make sure it is a valid .xlsx or .csv file.')
        setParsedRows([])
      }
    }
    reader.readAsArrayBuffer(file)
  }, [categories])

  const handleFileChange = (e) => parseFile(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  const validRows   = parsedRows.filter((_, i) => rowErrors[i]?.length === 0)
  const invalidRows = parsedRows.filter((_, i) => rowErrors[i]?.length  > 0)

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    setGlobalError('')
    try {
      const res = await bulkImportProducts(validRows)
      setImportResult(res.data?.data)
    } catch (err) {
      setGlobalError(err.response?.data?.message || 'Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bulk Upload Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Download the template, fill in your products, then upload the file.
          </p>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          ← Back to Products
        </button>
      </div>

      {/* Step 1 — Template */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
            1
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 mb-1">Download the Template</h2>
            <p className="text-sm text-gray-500 mb-4">
              The Excel template contains all supported columns with two sample rows and a notes row explaining each field.
              Images should be publicly accessible URLs (e.g. Google Drive direct-link, Dropbox, Cloudinary).
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm text-amber-800">
              <strong>Google Drive tip:</strong> Share the image → "Anyone with link can view" → copy the File ID from the URL and use:{' '}
              <code className="bg-amber-100 px-1 rounded">https://drive.google.com/uc?id=YOUR_FILE_ID</code>
            </div>
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-md text-sm hover:bg-amber-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Template (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Step 2 — Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
            2
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 mb-1">Upload Your Filled File</h2>
            <p className="text-sm text-gray-500 mb-4">Supports .xlsx and .csv files. Maximum 500 rows per upload.</p>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-gray-50'
              }`}
            >
              <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {fileName
                ? <p className="text-sm font-medium text-amber-700">{fileName}</p>
                : <p className="text-sm text-gray-500">Drag & drop your file here, or click to browse</p>
              }
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {globalError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {globalError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 3 — Preview & Import */}
      {parsedRows.length > 0 && !importResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900">Review & Import</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="text-green-700 font-medium">{validRows.length} valid</span>
                    {invalidRows.length > 0 && (
                      <span className="text-red-600 font-medium ml-2">· {invalidRows.length} with errors (will be skipped)</span>
                    )}
                    <span className="text-gray-500 ml-2">· {parsedRows.length} total rows</span>
                  </p>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing || validRows.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-amber-700 text-white rounded-md text-sm font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Importing…
                    </>
                  ) : (
                    <>
                      Import {validRows.length} Product{validRows.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">#</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Subcategory</th>
                      <th className="px-3 py-2 text-left">Price</th>
                      <th className="px-3 py-2 text-left">Publish Status</th>
                      <th className="px-3 py-2 text-left">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.map((row, i) => {
                      const errs = rowErrors[i] || []
                      const isValid = errs.length === 0
                      return (
                        <tr key={i} className={isValid ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2">
                            {isValid ? (
                              <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 text-xs px-2 py-0.5 rounded-full font-medium">
                                ✓ Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 text-xs px-2 py-0.5 rounded-full font-medium">
                                ✗ Errors
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">
                            {String(row.name || '—')}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{String(row.subcategory || '—')}</td>
                          <td className="px-3 py-2 text-gray-600">
                            {row.price !== '' && row.price !== undefined
                              ? `${row.currency || 'AED'} ${Number(row.price).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {String(row.status || 'draft') === 'published' ? (
                              <span className="text-green-700 bg-green-100 text-xs px-2 py-0.5 rounded-full">Published</span>
                            ) : (
                              <span className="text-gray-600 bg-gray-100 text-xs px-2 py-0.5 rounded-full">Draft</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {errs.length > 0 ? (
                              <ul className="space-y-0.5">
                                {errs.map((e, ei) => (
                                  <li key={ei} className="text-red-600 text-xs">• {e}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import results */}
      {importResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Import Complete
          </h2>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total Rows</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
              <p className="text-xs text-green-600 mt-1">Imported</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{importResult.skipped}</p>
              <p className="text-xs text-red-600 mt-1">Skipped</p>
            </div>
          </div>

          {/* Per-row results */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left w-10">#</th>
                  <th className="px-3 py-2 text-left">Product Name</th>
                  <th className="px-3 py-2 text-left">Result</th>
                  <th className="px-3 py-2 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {importResult.results.map((r, i) => (
                  <tr key={i} className={r.status === 'imported' ? 'bg-white' : 'bg-red-50'}>
                    <td className="px-3 py-2 text-gray-400">{r.row}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                    <td className="px-3 py-2">
                      {r.status === 'imported' ? (
                        <span className="text-green-700 bg-green-100 text-xs px-2 py-0.5 rounded-full font-medium">Imported</span>
                      ) : (
                        <span className="text-red-700 bg-red-100 text-xs px-2 py-0.5 rounded-full font-medium">Skipped</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-600">
                      {r.errors?.join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/products')}
              className="px-4 py-2 bg-amber-700 text-white rounded-md text-sm hover:bg-amber-800 transition-colors"
            >
              View All Products
            </button>
            <button
              onClick={() => {
                setParsedRows([])
                setRowErrors([])
                setFileName('')
                setImportResult(null)
                setGlobalError('')
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
