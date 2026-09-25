# Googly Seek

Hide and seek for googlies. Up to 8 players (friends and/or computer googlies) in one giant bedroom: crawl under the bed, hide behind the curtains, in the wardrobe, the tent, the box fort, the dollhouse or the laundry pile, or climb the book stairs onto the bed and the bookshelf. Seekers count with their hands over their eyes, then tag hiders, who join the seekers. Every 30 seconds the hiders squeak.

- **Lobbies**: public or private, 4-letter codes and invite links. While you wait you walk around the Waiting Hall (trampolines, a shop counter, a fountain).
- **Solo**: PLAY SOLO starts a round against computer googlies right away (Easy / Normal / Hard, choose to hide, seek or either).
- **Coins**: win rounds to earn coins. Spend them in the shop on skins and pets that follow you around.
- **Sound**: all sound effects and music are synthesised live (WebAudio).

## Layout

- `web/` — the game: `server.js` (Node + ws: lobbies, rounds, tags, coins, computer players) and `public/` (three.js client). Shared code in `public/js/sim.js` (movement, sight lines, layered nav grid + A*) and `public/js/maps.js`.
- `mac/` — `Googly Seek.app`, a native Mac window around the online game (`mac/build.sh`; `GS_URL` overrides the server).
- `render.yaml` — Render Blueprint (service `googly-seek`, root `web/`).

## Run locally

    cd web && npm install && npm start      # http://localhost:8000

## Tests

    node web/test/nav.mjs                                  # every hiding place is reachable, soft things block sight
    URL=ws://localhost:8000 node web/test/bots.mjs 1 7 120  # a CPU round: difficulty, CPUs, seek seconds
    PORT=8000 web/test/shot.sh out.png "quick=1&role=hide"  # headless screenshot (also: lobby=1, shop=1, icon=1, fakeend=1)
