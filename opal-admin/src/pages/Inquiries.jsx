import React, { useState, useEffect } from 'react'
import { getInquiries, updateInquiry, deleteInquiry, exportInquiries } from '../api/index.js'
import { Button } from '../components/ui/button.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog.jsx'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../components/ui/alert-dialog.jsx'
import { Download } from 'lucide-react'

function InquiryModal({ inquiry, open, onClose, onMarkRead }) {
  if (!inquiry) return null

  const date = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString()
    : '—'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inquiry Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">From</p>
              <p className="text-sm font-medium">{inquiry.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Date</p>
              <p className="text-sm">{date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
              <a href={`mailto:${inquiry.email}`} className="text-sm text-blue-600 hover:underline">
                {inquiry.email}
              </a>
            </div>
            {inquiry.phone && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Phone</p>
                <a href={`tel:${inquiry.phone}`} className="text-sm text-blue-600 hover:underline">
                  {inquiry.phone}
                </a>
              </div>
            )}
          </div>

          {inquiry.subject && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Subject</p>
              <p className="text-sm font-medium">{inquiry.subject}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Message</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted rounded p-3">
              {inquiry.message}
            </p>
          </div>
        </div>

        <DialogFooter className="items-center">
          <Badge variant={inquiry.is_read ? 'muted' : 'default'} className="mr-auto">
            {inquiry.is_read ? 'Read' : 'Unread'}
          </Badge>
          {!inquiry.is_read && (
            <Button variant="outline" onClick={() => onMarkRead(inquiry.id)}>
              Mark as Read
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [filter, setFilter]       = useState('all') // all | unread | read
  const [selected, setSelected]   = useState(null)
  const [exporting, setExporting] = useState(false)

  const fetchInquiries = () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.is_read = filter === 'read' ? '1' : '0'
    getInquiries(params)
      .then((res) => setInquiries(res.data?.data || res.data || []))
      .catch(() => setError('Failed to load inquiries.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchInquiries() }, [filter])

  const handleView = async (inquiry) => {
    setSelected(inquiry)
    if (!inquiry.is_read) {
      try {
        await updateInquiry(inquiry.id, { is_read: true })
        setInquiries((prev) =>
          prev.map((i) => (i.id === inquiry.id ? { ...i, is_read: true } : i))
        )
      } catch {}
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await updateInquiry(id, { is_read: true })
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)))
      setSelected((prev) => (prev?.id === id ? { ...prev, is_read: true } : prev))
    } catch {
      setError('Failed to update inquiry.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteInquiry(id)
      setInquiries((prev) => prev.filter((i) => i.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {
      setError('Failed to delete inquiry.')
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportInquiries()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Failed to export inquiries.')
    } finally {
      setExporting(false)
    }
  }

  const unreadCount = inquiries.filter((i) => !i.is_read).length

  const FILTERS = [
    { value: 'all',    label: `All (${inquiries.length})` },
    { value: 'unread', label: `Unread (${unreadCount})` },
    { value: 'read',   label: 'Read' },
  ]

  return (
    <div className="space-y-4">
      <InquiryModal
        inquiry={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onMarkRead={handleMarkRead}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No inquiries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  inquiries.map((inq) => (
                    <TableRow
                      key={inq.id}
                      className={`cursor-pointer ${!inq.is_read ? 'font-medium' : ''}`}
                      onClick={() => handleView(inq)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!inq.is_read && (
                            <span className="w-2 h-2 bg-gold rounded-full flex-shrink-0" />
                          )}
                          {inq.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{inq.email}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] truncate">
                        {inq.subject || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {inq.created_at ? new Date(inq.created_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inq.is_read ? 'muted' : 'default'}>
                          {inq.is_read ? 'Read' : 'Unread'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleView(inq)}>
                            View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Inquiry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete inquiry from {inq.name}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(inq.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
