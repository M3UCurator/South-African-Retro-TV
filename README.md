# South African Retro TV - Stremio Add-on v1.0.0

Catalogue add-on for classic South African television and film, built on `stremio-addon-sdk`.

## Run
```
npm install
npm start
```
Then in Stremio: Add-ons > Add-on Repository URL > `http://127.0.0.1:7000/manifest.json`

To deploy for phones/TV, host it (Render, Railway, Fly, a VPS) over HTTPS and install from that URL.

## Catalogue
Television: 'Sgudi 'Snaysi, Orkney Snork Nie, Ballade vir 'n Enkeling, Agter Elke Man, Interster, Haas Das se Nuuskas, Pumpkin Patch, Die Sonkring, Ubambo Lwami, Isidingo
Movies: The Gods Must Be Crazy, Mapantsula, Jock of the Bushveld, Kiepie en Kandas, Oh Shucks! Here Comes UNTAG

## Adding streams (catalogue.json)
Edit `catalogue.json`; changes are picked up without a restart. Each `sources` item supports:

| field | effect |
|---|---|
| `ytId` | plays a YouTube video inside Stremio |
| `url` | direct mp4 / m3u8 you have rights to |
| `externalUrl` | opens an official page (SABC Plus, Netflix, etc.) |

Series episodes: `"episodes": { "1:1": { "title": "Pilot", "sources": [ { "ytId": "..." } ] } }`
