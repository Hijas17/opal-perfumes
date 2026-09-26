/* ──────────────────────────────────────────────────────────────────────────
   UAE delivery areas the shopper can pick in the header's "Select Location"
   dialog. The store only delivers within the UAE.

   There is no public API for UAE community names that is worth depending on,
   so — like most GCC storefronts — this is a curated list. Add, rename or
   remove areas here; order within a region does not matter (the dialog sorts).
   ────────────────────────────────────────────────────────────────────────── */

/** Emirate (Al Ain split out, as shoppers expect) → areas. Insertion order is display order. */
export const DELIVERY_REGIONS: Record<string, string[]> = {
  Dubai: [
    'Abu Hail', 'Al Awir', 'Al Baraha', 'Al Barari', 'Al Barsha 1', 'Al Barsha 2',
    'Al Barsha 3', 'Al Barsha South', 'Al Furjan', 'Al Garhoud', 'Al Habtoor City',
    'Al Hamriya', 'Al Hudaiba', 'Al Jaddaf', 'Al Jafiliya', 'Al Karama',
    'Al Khail Gate', 'Al Khawaneej', 'Al Kifaf', 'Al Lisaili', 'Al Mamzar',
    'Al Manara', 'Al Mankhool', 'Al Mizhar', 'Al Muraqqabat', 'Al Muteena',
    'Al Nahda', 'Al Qudra', 'Al Quoz', 'Al Qusais', 'Al Raffa', 'Al Ras',
    'Al Rashidiya', 'Al Rigga', 'Al Safa', 'Al Satwa', 'Al Sufouh', 'Al Twar',
    'Al Waheda', 'Al Warqaa', 'Al Warsan', 'Al Wasl', 'Arabian Ranches',
    'Arabian Ranches 2', 'Arabian Ranches 3', 'Arjan', 'Barsha Heights (Tecom)',
    'Bluewaters Island', 'Bur Dubai', 'Business Bay', 'City Walk', 'DAMAC Hills',
    'DAMAC Hills 2', 'Deira', 'DIFC', 'Discovery Gardens', 'Downtown Dubai',
    'Dubai Creek Harbour', 'Dubai Festival City', 'Dubai Harbour',
    'Dubai Healthcare City', 'Dubai Hills Estate', 'Dubai Internet City',
    'Dubai Investments Park', 'Dubai Knowledge Park', 'Dubai Land', 'Dubai Marina',
    'Dubai Media City', 'Dubai Production City (IMPZ)', 'Dubai Silicon Oasis',
    'Dubai South', 'Dubai Sports City', 'Dubai Studio City', 'Emaar Beachfront',
    'Emirates Hills', 'Hatta', 'International City', 'Jebel Ali',
    'Jumeirah 1', 'Jumeirah 2', 'Jumeirah 3', 'Jumeirah Beach Residence (JBR)',
    'Jumeirah Golf Estates', 'Jumeirah Islands', 'Jumeirah Lake Towers (JLT)',
    'Jumeirah Park', 'Jumeirah Village Circle (JVC)', 'Jumeirah Village Triangle (JVT)',
    'La Mer', 'Liwan', 'Majan', 'Meydan', 'Mirdif', 'Mohammed Bin Rashid City',
    'Motor City', 'Mudon', 'Muhaisnah', 'Nad Al Hamar', 'Nad Al Sheba', 'Oud Metha',
    'Palm Jumeirah', 'Port Rashid', 'Ras Al Khor', 'Remraam', 'Serena',
    'Sheikh Zayed Road', 'Sobha Hartland', 'The Greens', 'The Lakes', 'The Meadows',
    'The Springs', 'The Views', 'The Villa', 'Tilal Al Ghaf', 'Town Square',
    'Umm Hurair', 'Umm Ramool', 'Umm Suqeim 1', 'Umm Suqeim 2', 'Umm Suqeim 3',
    'Wadi Al Safa', 'Zabeel',
  ],
  Sharjah: [
    'Abu Shagara', 'Al Azra', 'Al Butina', 'Al Dhaid', 'Al Falaj', 'Al Fisht',
    'Al Gharb', 'Al Ghubaiba', 'Al Heera', 'Al Jazzat', 'Al Juraina', 'Al Khalidia',
    'Al Khan', 'Al Khezamia', 'Al Layyah', 'Al Madam', 'Al Majaz 1', 'Al Majaz 2',
    'Al Majaz 3', 'Al Mamsha', 'Al Mirgab', 'Al Mughaidir', 'Al Mujarrah',
    'Al Musalla', 'Al Nabba', 'Al Nahda', 'Al Nasserya', 'Al Nud', 'Al Qadisiya',
    'Al Qasba', 'Al Qasimia', 'Al Rahmaniya', 'Al Ramla', 'Al Ramtha', 'Al Riqa',
    'Al Sajaa', 'Al Sharq', 'Al Suyoh', 'Al Taawun', 'Al Tallah', 'Al Yarmook',
    'Al Zahia', 'Aljada', 'Dibba Al Hisn', 'Halwan', 'Industrial Area', 'Kalba',
    'Khor Fakkan', 'Maryam Island', 'Maysaloon', 'Muwaileh', 'Rolla', 'Samnan',
    'Sharjah Waterfront City', 'Sharqan', 'Tilal City', 'University City',
  ],
  Ajman: [
    'Ajman Downtown', 'Ajman Industrial Area', 'Al Alia', 'Al Amerah', 'Al Bustan',
    'Al Hamidiya', 'Al Helio', 'Al Jurf', 'Al Mowaihat 1', 'Al Mowaihat 2',
    'Al Mowaihat 3', 'Al Nakhil', 'Al Nuaimiya 1', 'Al Nuaimiya 2', 'Al Nuaimiya 3',
    'Al Rashidiya 1', 'Al Rashidiya 2', 'Al Rashidiya 3', 'Al Rawda 1', 'Al Rawda 2',
    'Al Rawda 3', 'Al Rumailah', 'Al Sawan', 'Al Tallah 1', 'Al Tallah 2',
    'Al Yasmeen', 'Al Zahra', 'Al Zorah', 'Corniche Ajman', 'Emirates City',
    'Garden City', 'Manama', 'Masfout', 'Musherief',
  ],
  'Abu Dhabi': [
    'Al Bahia', 'Al Bateen', 'Al Danah', 'Al Falah', 'Al Ghadeer', 'Al Karamah',
    'Al Khalidiyah', 'Al Khubeirah', 'Al Manhal', 'Al Maqta', 'Al Markaziyah',
    'Al Maryah Island', 'Al Mina', 'Al Muroor', 'Al Mushrif', 'Al Nahyan',
    'Al Qurm', 'Al Raha Beach', 'Al Raha Gardens', 'Al Rahba', 'Al Reef',
    'Al Reem Island', 'Al Rowdah', 'Al Samha', 'Al Shamkha', 'Al Wahdah',
    'Al Wathba', 'Al Zahiyah (Tourist Club)', 'Baniyas', 'Bain Al Jessrain',
    'Capital Centre (ADNEC)', 'Corniche', 'Ghayathi', 'Hydra Village',
    'Khalifa City', 'Liwa', 'Madinat Zayed', 'Masdar City', 'Mirfa',
    'Mohammed Bin Zayed City', 'Mussafah', 'Ruwais', 'Saadiyat Island',
    'Shakhbout City', 'Yas Island',
  ],
  'Al Ain': [
    'Al Bateen', 'Al Dhahir', 'Al Foah', 'Al Grayyeh', 'Al Hili', 'Al Jahili',
    'Al Jimi', 'Al Khabisi', 'Al Khrair', 'Al Kuwaitat', 'Al Maqam', 'Al Markhaniya',
    'Al Masoudi', 'Al Mutarad', 'Al Mutawaa', 'Al Muwaiji', 'Al Neyadat',
    'Al Qattara', 'Al Salamat', 'Al Sarooj', 'Al Towayya', 'Al Yahar', 'Asharej',
    'Central District', 'Falaj Hazza', 'Mazyad', 'Zakher',
  ],
  'Umm Al Quwain': [
    'Al Abraq', 'Al Dar Al Baida', 'Al Haditha', 'Al Hamra', 'Al Humrah',
    'Al Khor', 'Al Maidan', 'Al Raas', 'Al Ramlah', 'Al Raudah', 'Al Riqqa',
    'Al Salamah', 'Al Surra', 'Falaj Al Mualla', 'Old Town', 'Umm Al Quwain Marina',
    'Umm Al Quwain Industrial Area',
  ],
  'Ras Al Khaimah': [
    'Al Dhait North', 'Al Dhait South', 'Al Fahlain', 'Al Hamra Village',
    'Al Hudaibah', 'Al Jazirah Al Hamra', 'Al Juwais', 'Al Kharan', 'Al Mairid',
    'Al Mamourah', 'Al Marjan Island', 'Al Nakheel', 'Al Qurm', 'Al Rams',
    'Al Seer', 'Al Uraibi', 'Dafan Al Khor', 'Digdaga', 'Julphar',
    'Khor Khwair', 'Khuzam', 'Mina Al Arab', 'Old Town', 'Seih Al Uraibi',
    'Shaam', 'Sidroh',
  ],
  Fujairah: [
    'Al Aqah', 'Al Bithnah', 'Al Faseel', 'Al Gurfa', 'Al Hail', 'Al Owaid',
    'Al Siji', 'Dibba Al Fujairah', 'Fujairah City', 'Fujairah Corniche',
    'Fujairah Free Zone', 'Madhab', 'Masafi', 'Merashid', 'Mirbah', 'Qidfa',
    'Rughaylat', 'Sakamkam',
  ],
}

export function isKnownArea(region: string, area: string): boolean {
  return DELIVERY_REGIONS[region]?.includes(area) ?? false
}

/** Lowercase, drop punctuation and a leading "al" so "Al-Barsha" ≈ "barsha". */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(al|el|the|emirate|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Best-effort match of reverse-geocoded place names onto our curated list.
 *
 * `region` is the state/emirate name the geocoder returned ("Dubai",
 * "Abu Dhabi Emirate", …); `places` are finer-grained names, most specific
 * first (neighbourhood, suburb, district, city).
 *
 * Only an unambiguous name match picks an area. Otherwise the region is still
 * returned, with the most specific place name as a search hint, so the dialog
 * can narrow the list and let the shopper make the final pick — "Al Barsha"
 * must not silently become "Al Barsha 1".
 */
export function matchLocation(
  region: string | undefined,
  places: string[],
): { region: string; area?: string; hint?: string } | null {
  const regionNames = Object.keys(DELIVERY_REGIONS)
  const wanted = places.map(normalise)

  // Al Ain sits inside Abu Dhabi emirate but has its own list, so a city
  // name takes precedence over the emirate-level match.
  const matchedRegion =
    regionNames.find((r) => wanted.includes(normalise(r))) ??
    (region ? regionNames.find((r) => normalise(r) === normalise(region)) : undefined)
  if (!matchedRegion) return null

  const areas = DELIVERY_REGIONS[matchedRegion]
  for (const place of wanted) {
    if (!place) continue
    const area = areas.find((a) => normalise(a) === place)
    if (area) return { region: matchedRegion, area }
  }

  const hint = places.find((p, i) => wanted[i] && !regionNames.some((r) => normalise(r) === wanted[i]))
  return { region: matchedRegion, hint }
}
