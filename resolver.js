// Cross-references catalogue entries with TMDB / IMDb so Stremio gets canonical ids.
// Order of precedence per entry:
//   1. imdbId / tmdbId set by hand in catalogue.json
//   2. TMDB search + external_ids (needs env TMDB_API_KEY)
//   3. Cinemeta search (keyless; Stremio's own IMDb-keyed metadata service)
// Only exact normalised-title matches are accepted, so a wrong film is never linked.
const fs = require('fs')
const path = require('path')

const CACHE_PATH = path.join(__dirname, 'ids-cache.json')
const TMDB = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p/'
const KEY = process.env.TMDB_API_KEY

let cache = {}
try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) } catch (e) { /* first run */ }

const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

async function getJSON(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } })
  if (!r.ok) throw new Error(`${r.status} ${url.replace(KEY || '@@', '***')}`)
  return r.json()
}

async function viaTmdb(entry, type) {
  const kind = type === 'movie' ? 'movie' : 'tv'
  let id = entry.tmdbId
  if (!id) {
    const p = new URLSearchParams({ api_key: KEY, query: entry.name })
    if (entry.year) p.set(kind === 'movie' ? 'year' : 'first_air_date_year', entry.year)
    const s = await getJSON(`${TMDB}/search/${kind}?${p}`)
    const hit = (s.results || []).find((r) =>
      norm(r.title || r.name) === norm(entry.name) ||
      norm(r.original_title || r.original_name) === norm(entry.name))
    if (!hit) return null
    id = hit.id
  }
  const d = await getJSON(`${TMDB}/${kind}/${id}?api_key=${KEY}&append_to_response=external_ids`)
  return {
    tmdbId: id,
    imdbId: (d.external_ids && d.external_ids.imdb_id) || d.imdb_id || null,
    poster: d.poster_path ? IMG + 'w500' + d.poster_path : null,
    background: d.backdrop_path ? IMG + 'w1280' + d.backdrop_path : null,
    overview: d.overview || null
  }
}

async function viaCinemeta(entry, type) {
  const t = type === 'movie' ? 'movie' : 'series'
  const j = await getJSON(`https://v3-cinemeta.strem.io/catalog/${t}/top/search=${encodeURIComponent(entry.name)}.json`)
  const hit = (j.metas || []).find((m) =>
    norm(m.name) === norm(entry.name) &&
    (!entry.year || String(m.releaseInfo || m.year || '').startsWith(String(entry.year))))
  const imdbId = hit && (hit.imdb_id || hit.id)
  if (!imdbId || !/^tt\d+$/.test(imdbId)) return null
  return { imdbId, poster: hit.poster || null, background: hit.background || null }
}

// Returns { imdbId?, tmdbId?, poster?, background?, overview? } (possibly empty)
async function resolve(entry, type) {
  const key = `${type}:${entry.id}`
  if (cache[key]) return { ...cache[key], ...manual(entry) }

  let found = null
  try { if (KEY) found = await viaTmdb(entry, type) } catch (e) { console.warn('TMDB lookup failed for', entry.name, e.message) }
  if (!found || !found.imdbId) {
    try {
      const c = await viaCinemeta(entry, type)
      if (c) found = { ...(found || {}), ...c, poster: (found && found.poster) || c.poster }
    } catch (e) { console.warn('Cinemeta lookup failed for', entry.name, e.message) }
  }
  if (found && (found.imdbId || found.tmdbId)) {
    cache[key] = found
    try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2)) } catch (e) { /* read-only fs */ }
  }
  return { ...(found || {}), ...manual(entry) }
}

function manual(entry) {
  const m = {}
  if (entry.imdbId) m.imdbId = entry.imdbId
  if (entry.tmdbId) m.tmdbId = entry.tmdbId
  return m
}

module.exports = { resolve }
