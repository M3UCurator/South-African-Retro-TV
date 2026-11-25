#!/usr/bin/env node
// South African Retro TV - Stremio Add-on v1.0.0
const { addonBuilder, serveHTTP } = require('stremio-addon-sdk')
const fs = require('fs')
const path = require('path')

const CATALOGUE_PATH = path.join(__dirname, 'catalogue.json')

// Re-read on every request so you can edit catalogue.json without restarting
function load() {
  return JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf8'))
}

const manifest = {
  id: 'community.sa-retro-tv',
  version: '1.0.0',
  name: 'South African Retro TV',
  description: 'Classic South African television and films: Sgudi Snaysi, Orkney Snork Nie, Isidingo, Mapantsula and more.',
  resources: ['catalog', 'meta', 'stream'],
  types: ['series', 'movie'],
  idPrefixes: ['sartv:'],
  catalogs: [
    { type: 'series', id: 'sartv-series', name: 'SA Retro TV - Television', extra: [{ name: 'search', isRequired: false }] },
    { type: 'movie', id: 'sartv-movies', name: 'SA Retro TV - Movies', extra: [{ name: 'search', isRequired: false }] }
  ]
}

const builder = new addonBuilder(manifest)

const toPreview = (type) => (e) => ({
  id: e.id,
  type,
  name: e.name,
  poster: e.poster,
  description: e.description,
  releaseInfo: e.releaseInfo,
  genres: e.genres
})

builder.defineCatalogHandler(async ({ type, extra }) => {
  const list = load()[type] || []
  const q = extra && extra.search ? extra.search.toLowerCase() : null
  const metas = list
    .filter((e) => !q || e.name.toLowerCase().includes(q))
    .map(toPreview(type))
  return { metas }
})

builder.defineMetaHandler(async ({ type, id }) => {
  const entry = (load()[type] || []).find((e) => e.id === id)
  if (!entry) return { meta: null }

  const meta = { ...toPreview(type)(entry), background: entry.background }

  if (type === 'series') {
    const keys = Object.keys(entry.episodes || {})
    const videos = keys.length
      ? keys.map((k) => {
          const [season, episode] = k.split(':').map(Number)
          const ep = entry.episodes[k]
          return {
            id: `${id}:${season}:${episode}`,
            title: ep.title || `Episode ${episode}`,
            season,
            episode,
            released: ep.released || '1990-01-01T00:00:00.000Z'
          }
        })
      : // series-level sources are exposed through a single entry
        [{ id: `${id}:1:1`, title: 'Watch options', season: 1, episode: 1, released: '1990-01-01T00:00:00.000Z' }]
    meta.videos = videos
  }
  return { meta }
})

// Convert one catalogue source object to a Stremio stream object
function toStream(s) {
  const base = { name: s.name || 'SA Retro TV', title: s.title }
  if (s.ytId) return { ...base, ytId: s.ytId }
  if (s.url) return { ...base, url: s.url, behaviorHints: { notWebReady: !!s.notWebReady } }
  if (s.externalUrl) return { ...base, externalUrl: s.externalUrl }
  return null
}

builder.defineStreamHandler(async ({ type, id }) => {
  const data = load()
  let sources = []

  if (type === 'movie') {
    const entry = data.movie.find((e) => e.id === id)
    sources = entry ? entry.sources || [] : []
  } else {
    // id looks like sartv:slug:season:episode
    const parts = id.split(':')
    const episode = parts.pop()
    const season = parts.pop()
    const baseId = parts.join(':')
    const entry = data.series.find((e) => e.id === baseId)
    if (entry) {
      const ep = (entry.episodes || {})[`${season}:${episode}`]
      sources = (ep && ep.sources) || entry.sources || []
    }
  }

  return { streams: sources.map(toStream).filter(Boolean) }
})

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 })
console.log('Install in Stremio via: http://127.0.0.1:' + (process.env.PORT || 7000) + '/manifest.json')
