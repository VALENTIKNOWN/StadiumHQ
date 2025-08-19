import { app } from "./app.js";
import dotenv from "dotenv";
dotenv.config();

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  process.stdout.write(`API on http://localhost:${port}\n`);
});

