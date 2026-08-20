https://isaiahcampusano.github.io/tetris/

<img width="786" height="910" alt="image" src="https://github.com/user-attachments/assets/2938bcde-df35-4642-a7a3-da151f52f2c8" />


## Local development

Install dependencies and start the combined game and leaderboard server:

```sh
npm install
npm start
```

Open `http://localhost:3000`. The same server hosts the static game and the
shared `/api/scores` leaderboard API, with entries persisted in
`server/data/high-scores.json`.

Set `HIGH_SCORE_DATA_FILE` to an absolute path when the server uses a mounted
persistent disk (for example, `/var/data/high-scores.json` on Render).

Run the automated checks with `npm test`.

The live GitHub Pages site uses the free Cloudflare Worker and D1 database
configured in `wrangler.jsonc`. The Worker source is in `worker/src/index.js`,
and its schema is in `worker/migrations/0001_create_scores.sql`.

## Leaderboard API

- `GET /api/scores` returns the ranked leaderboard.
- `POST /api/scores` saves qualifying scores of 50,000 or more.
- `DELETE /api/scores` clears all scores.

The clear endpoint is intentionally unauthenticated for this hobby project.
Anyone who can reach the API can erase the leaderboard, so authentication or
an admin-only control should be added before using it for a higher-traffic site.
