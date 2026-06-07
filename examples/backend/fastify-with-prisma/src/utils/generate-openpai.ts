import { FastifyInstance } from "fastify";
import { writeFileSync } from "fs";
import { resolve } from "path";

export function generateOpenapi(app: FastifyInstance) {
  const spec = app.swagger();
  const outputPath = resolve(import.meta.dirname, "../../openapi.json");

  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  app.log.info(`OpenAPI spec generated 👌`);
}
