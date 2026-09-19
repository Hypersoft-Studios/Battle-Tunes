import { join } from "node:path";
import { createServer } from "./http.js";

const server = createServer({
	staticDir: join(process.cwd(), "dist/client"),
});

server.listen(3000);
