#!/usr/bin/env node

import { createCli } from "./cli.js";

const cli = createCli();

try {
  cli.parse(process.argv, { run: true });
} catch (error) {
  if (error instanceof Error) {
    console.error("Error:", error.message);
  }
  process.exit(1);
}
