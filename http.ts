import * as http from "node:http";

const server = http.createServer((_req, res) => {
  res.write("http server", () => res.end());
});

export function listen(port: number) {
  server.listen(port);
}
