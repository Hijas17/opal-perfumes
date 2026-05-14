import React, { useState, useEffect, useRef } from 'react'
import { getAdminSettings, updateSettings, UPLOADS_URL } from '../api/index.js'
import api from '../api/index.js'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { Button } from '../components/ui/button.jsx'
import { Input } from '../components/ui/input.jsx'
import { Textarea } from '../components/ui/textarea.jsx'
import { Label } from '../components/ui/label.jsx'
import { Card, CardContent } from '../components/ui/card.jsx'
import { Alert, AlertDescription } from '../components/ui/alert.jsx'
import { Separator } from '../components/ui/separator.jsx'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select.jsx'
import { cn } from '../lib/utils.js'

const SECTION_LABELS = {
  general: 'General',
  home:    'Home Page',
  about:   'About Us',
  social:  'Social Media',
  contact: 'Contact',
}

function ImageSettingField({ label, settingKey, currentValue, onUpdate }) {
  const inputRef   = useRef(null)
  const [uploading, setUploading] = useState(false)
  const previewUrl = currentValue ? `${UPLOADS_URL}/${currentValue}` : null

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('key', settingKey)
      formData.append('file', file)
      const res = await api.post('/admin/settings/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newVal = res.data?.data?.value || res.data?.value || ''
      onUpdate(settingKey, newVal)
    } catch {
      // silent
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {previewUrl && (
        <div className="mb-2">
          <img
            src={previewUrl}
            alt={label}
            className="h-28 w-auto object-cover rounded border border-border"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        </div>
      )}
      <div
        className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-gold transition-colors duration-150"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <p className="text-xs text-muted-foreground">Uploading…</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {currentValue ? 'Replace image' : 'Click to upload'} · JPG, PNG, WEBP
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings]       = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [activeSection, setActiveSection] = useState('general')

  useEffect(() => {
    getAdminSettings()
      .then((res) => {
        const raw = res.data?.data || res.data || {}
        if (Array.isArray(raw)) {
          const normalized = {}
          raw.forEach((item) => { normalized[item.key] = item.value })
          setSettings(normalized)
        } else {
          setSettings(raw)
        }
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await updateSettings(settings)
      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const s = settings

  const sections = {
    general: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Brand Name</Label>
            <Input value={s.brand_name || ''} onChange={(e) => handleChange('brand_name', e.target.value)} placeholder="Opal Perfumes" />
          </div>
          <div className="space-y-1.5">
            <Label>Default Currency</Label>
            <Select value={s.currency || 'AED'} onValueChange={(v) => handleChange('currency', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['AED', 'USD', 'SAR', 'EUR', 'GBP'].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Footer Tagline</Label>
          <Input value={s.footer_tagline || ''} onChange={(e) => handleChange('footer_tagline', e.target.value)} placeholder="Luxury fragrances for every moment" />
        </div>
      </div>
    ),

    contact: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input type="email" value={s.contact_email || ''} onChange={(e) => handleChange('contact_email', e.target.value)} placeholder="info@opalperfumes.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Phone</Label>
            <Input value={s.contact_phone || ''} onChange={(e) => handleChange('contact_phone', e.target.value)} placeholder="+971 XX XXX XXXX" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp Number</Label>
          <Input value={s.whatsapp_number || ''} onChange={(e) => handleChange('whatsapp_number', e.target.value)} placeholder="+971501234567" />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Textarea rows={3} className="resize-none" value={s.address || ''} onChange={(e) => handleChange('address', e.target.value)} placeholder="123 Sheikh Zayed Road, Dubai, UAE" />
        </div>
      </div>
    ),

    social: (
      <div className="space-y-4">
        {[
          { key: 'facebook_url',  label: 'Facebook URL',  placeholder: 'https://facebook.com/…' },
          { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/…' },
          { key: 'youtube_url',   label: 'YouTube URL',   placeholder: 'https://youtube.com/…' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Input type="url" value={s[key] || ''} onChange={(e) => handleChange(key, e.target.value)} placeholder={placeholder} />
          </div>
        ))}
      </div>
    ),

    home: (
      <div className="space-y-5">
        <ImageSettingField
          label="Hero Background Image"
          settingKey="hero_image"
          currentValue={s.hero_image}
          onUpdate={handleChange}
        />
        <ImageSettingField
          label="Hero Bottle / Product Image (3D PNG, transparent background)"
          settingKey="hero_bottle_image"
          currentValue={s.hero_bottle_image}
          onUpdate={handleChange}
        />
        <div className="space-y-1.5">
          <Label>Hero Tagline <span className="text-muted-foreground font-normal text-xs">(small text above headline)</span></Label>
          <Input value={s.hero_tagline || ''} onChange={(e) => handleChange('hero_tagline', e.target.value)} placeholder="Luxury Fragrances" />
        </div>
        <div className="space-y-1.5">
          <Label>Hero Headline</Label>
          <Input value={s.hero_headline || ''} onChange={(e) => handleChange('hero_headline', e.target.value)} placeholder="Discover Your Signature Scent" />
        </div>
        <div className="space-y-1.5">
          <Label>Hero Subtext</Label>
          <Textarea rows={2} className="resize-none" value={s.hero_subtext || ''} onChange={(e) => handleChange('hero_subtext', e.target.value)} placeholder="Handcrafted luxury perfumes…" />
        </div>
        <div className="space-y-1.5">
          <Label>About Snippet <span className="text-muted-foreground font-normal text-xs">(shown on home page)</span></Label>
          <Textarea rows={3} className="resize-none" value={s.about_snippet || ''} onChange={(e) => handleChange('about_snippet', e.target.value)} placeholder="Short brand intro shown under Featured Products…" />
        </div>
        <div className="space-y-1.5">
          <Label>CTA Strip Message</Label>
          <Input value={s.cta_message || ''} onChange={(e) => handleChange('cta_message', e.target.value)} placeholder="Find Your Perfect Fragrance" />
        </div>
      </div>
    ),

    about: (
      <div className="space-y-5">
        <ImageSettingField
          label="About Us Hero Image"
          settingKey="about_hero_image"
          currentValue={s.about_hero_image}
          onUpdate={handleChange}
        />
        <div className="space-y-1.5">
          <Label>Brand Story</Label>
          <RichTextEditor value={s.brand_story || ''} onChange={(val) => handleChange('brand_story', val)} />
        </div>
        <div className="space-y-1.5">
          <Label>Mission Statement</Label>
          <Input value={s.mission_statement || ''} onChange={(e) => handleChange('mission_statement', e.target.value)} placeholder="A short inspiring quote or mission…" />
        </div>
        <ImageSettingField
          label="Founder Photo"
          settingKey="founder_photo"
          currentValue={s.founder_photo}
          onUpdate={handleChange}
        />
        <div className="space-y-1.5">
          <Label>Founder Bio</Label>
          <RichTextEditor value={s.founder_bio || ''} onChange={(val) => handleChange('founder_bio', val)} />
        </div>
      </div>
    ),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
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

      <div className="flex flex-col md:flex-row gap-6">
        {/* Section Nav */}
        <div className="md:w-48 flex-shrink-0">
          <Card>
            <CardContent className="p-2 space-y-0.5">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded text-sm font-medium transition-colors duration-150',
                    activeSection === key
                      ? 'bg-gold text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Section Content */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-foreground pb-3 mb-5">
                {SECTION_LABELS[activeSection]}
              </h2>
              <Separator className="mb-5" />
              {sections[activeSection]}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-8">
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
