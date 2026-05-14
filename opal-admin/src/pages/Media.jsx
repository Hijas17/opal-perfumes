import React, { useState, useEffect, useRef } from 'react'
import { getMedia, uploadMedia, deleteMedia, UPLOADS_URL } from '../api/index.js'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Dialog, DialogContent } from '../components/ui/dialog.jsx'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog.jsx'
import { Upload, Copy, Trash2, Image as ImageIcon } from 'lucide-react'

export default function Media() {
  const [files, setFiles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [preview, setPreview]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const inputRef = useRef(null)

  const fetchMedia = () => {
    setLoading(true)
    getMedia()
      .then((res) => setFiles(res.data?.data || res.data || []))
      .catch(() => setError('Failed to load media files.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMedia() }, [])

  const handleUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (!selectedFiles.length) return
    setError('')
    setSuccess('')
    setUploading(true)
    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        await uploadMedia(formData)
      }
      setSuccess(`${selectedFiles.length} file(s) uploaded successfully.`)
      fetchMedia()
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed. Check file type and size (max 5MB).')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (filename) => {
    setError('')
    try {
      await deleteMedia(filename)
      setFiles((prev) => prev.filter((f) => (f.filename || f) !== filename))
      if (preview === filename) setPreview(null)
      setSuccess('File deleted.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete file.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const copyUrl = (filename) => {
    navigator.clipboard.writeText(`${UPLOADS_URL}/${filename}`).then(() => {
      setSuccess('URL copied to clipboard.')
      setTimeout(() => setSuccess(''), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => { if (!v) setPreview(null) }}>
        <DialogContent className="max-w-3xl p-2 bg-black border-0">
          {preview && (
            <img
              src={`${UPLOADS_URL}/${preview}`}
              alt="Preview"
              className="max-h-[85vh] w-full object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Upload Images</h2>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · max 5MB each</p>
          </div>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-gold transition-colors duration-150"
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading…</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Click to upload or drag images here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Multiple files supported</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              All Files{' '}
              <span className="text-muted-foreground font-normal text-sm">({files.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm">No files uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {files.map((file) => {
                const filename = typeof file === 'string' ? file : file.filename || file.name || file
                const url = `${UPLOADS_URL}/${filename}`
                return (
                  <div
                    key={filename}
                    className="group relative bg-muted rounded-lg overflow-hidden border border-border hover:border-gold transition-colors duration-150"
                  >
                    <div
                      className="aspect-square cursor-pointer"
                      onClick={() => setPreview(filename)}
                    >
                      <img
                        src={url}
                        alt={filename}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => copyUrl(filename)}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-foreground hover:text-gold shadow-sm"
                        title="Copy URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(filename)}
                        className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center text-white hover:bg-destructive/90 shadow-sm"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-[10px] text-muted-foreground truncate" title={filename}>
                        {filename}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
