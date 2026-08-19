import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

createApp().listen(port, () => {
  console.log(`Neon Stack is running at http://localhost:${port}`);
});
