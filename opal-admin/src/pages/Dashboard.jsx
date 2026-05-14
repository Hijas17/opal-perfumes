import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard } from '../api/index.js'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Badge } from '../components/ui/badge.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Button } from '../components/ui/button.jsx'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.jsx'
import { Separator } from '../components/ui/separator.jsx'
import { Package, Mail, Tag, Plus, Image } from 'lucide-react'

function StatCard({ title, value, icon: Icon, iconClass }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
        </div>
      </CardContent>
    </Card>
  )
}

const QUICK_ACTIONS = [
  { icon: Plus,  label: 'Add Product',    sub: 'Create a new product listing',   path: '/products/new' },
  { icon: Tag,   label: 'Add Category',   sub: 'Manage product categories',       path: '/categories' },
  { icon: Mail,  label: 'View Inquiries', sub: null,                              path: '/inquiries' },
  { icon: Image, label: 'Media Library',  sub: 'Upload and manage images',        path: '/media' },
]

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const categoryCards = data?.products_by_category || []

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total Products"   value={data?.total_products}   icon={Package} iconClass="text-gold" />
        <StatCard title="Unread Inquiries" value={data?.unread_inquiries} icon={Mail}    iconClass="text-red-500" />
        {categoryCards.map((cat) => (
          <StatCard key={cat.category} title={cat.category} value={cat.count} icon={Tag} iconClass="text-indigo-500" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inquiries */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="font-semibold text-foreground">Recent Inquiries</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/inquiries')}>
                  View all
                </Button>
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data?.recent_inquiries?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No recent inquiries
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recent_inquiries.map((inq) => (
                      <TableRow key={inq.id}>
                        <TableCell className="font-medium">{inq.name}</TableCell>
                        <TableCell className="text-muted-foreground">{inq.subject}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(inq.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={inq.is_read ? 'muted' : 'default'}>
                            {inq.is_read ? 'Read' : 'Unread'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {QUICK_ACTIONS.map(({ icon: Icon, label, sub, path }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:border-gold hover:bg-accent transition-colors duration-150 text-left"
                  >
                    <Icon className="w-5 h-5 text-gold flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {label === 'View Inquiries' ? (
                        <p className="text-xs text-muted-foreground">
                          {data?.unread_inquiries
                            ? `${data.unread_inquiries} unread messages`
                            : 'Manage customer messages'}
                        </p>
                      ) : (
                        sub && <p className="text-xs text-muted-foreground">{sub}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
