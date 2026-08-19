https://isaiahcampusano.github.io/tetris/

## Local development

Install dependencies and start the combined game and leaderboard server:

```sh
npm install
npm start
```

Open `http://localhost:3000`. The same server hosts the static game and the
shared `/api/scores` leaderboard API, with entries persisted in
`server/data/high-scores.json`.

Run the automated checks with `npm test`.

## Leaderboard API

- `GET /api/scores` returns the ranked leaderboard.
- `POST /api/scores` saves qualifying scores of 50,000 or more.
- `DELETE /api/scores` clears all scores.

The clear endpoint is intentionally unauthenticated for this hobby project.
Anyone who can reach the API can erase the leaderboard, so authentication or
an admin-only control should be added before using it for a higher-traffic site.
