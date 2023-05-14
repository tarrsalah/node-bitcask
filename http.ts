import * as http from "node:http";
import {BitCask} from "./bitcask";
import queryString from "node:querystring";
import url from "node:url";

export function createServer(bitcask: BitCask) {
  return http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      const parsedUrl = url.parse(req.url || "");
      const q = queryString.parse(parsedUrl.query || "");

      if (q.key === undefined) {
        res.writeHead(420, { "Content-Type": "application/json" });
        res.write(JSON.stringify({ error: true, message: "query malformed!" }));
        res.end();
      } else {
        const key = Array.isArray(q.key) ? q.key[0] : q.key;

        bitcask
          .get(key)
          .then((body) => {
            if (body === undefined) {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.write(JSON.stringify({ message: "not found" }));
              res.end();
            } else {
              res.writeHead(200, {
                "Content-Type": "application/octet-stream",
              });
              res.end(body);
            }
          })
          .catch((_err) => {
            res.writeHead(501, { "Content-Type": "application/json." });
            res.write(JSON.stringify({ message: "unhandeled error!" }));
            res.end();
          });
      }
    }
  );
}
