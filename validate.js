// Validates manifest.json with the official SDK and checks it matches catalogue.json
const { addonBuilder } = require('stremio-addon-sdk')
const manifest = require('./manifest.json')
const catalogue = require('./catalogue.json')

let ok = true
try {
  new addonBuilder(manifest)
  console.log('SDK manifest validation: OK')
} catch (e) {
  console.error('SDK manifest validation FAILED:', e.message)
  ok = false
}

for (const t of manifest.types) {
  if (!Array.isArray(catalogue[t]) || !catalogue[t].length) {
    console.error(`Manifest lists type "${t}" but catalogue.json has no entries for it`)
    ok = false
  }
  if (!manifest.catalogs.some((c) => c.type === t)) {
    console.error(`No catalog declared for type "${t}"`)
    ok = false
  }
}
for (const t of Object.keys(catalogue)) {
  if (Array.isArray(catalogue[t]) && catalogue[t].length && !manifest.types.includes(t)) {
    console.error(`catalogue.json has "${t}" entries but manifest.json types lacks "${t}"`)
    ok = false
  }
}
console.log(ok ? 'All checks passed' : 'Fix the issues above')
process.exit(ok ? 0 : 1)
