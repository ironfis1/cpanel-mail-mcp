#!/usr/bin/env node
// Traceability check: docs/spec.md REQs vs test names in test/ vs docs/build/traceability.md.
//
//   node scripts/trace.mjs                      per-chunk table
//   node scripts/trace.mjs --chunk C0           table plus that chunk's uncovered rows
//   node scripts/trace.mjs --chunk C0 --strict  exit 1 if any C0 row is uncovered or blank
//   --root <dir>                                run against another tree (self-tests)
//
// A row is filled when "Verified by" is non-blank. It is covered when it is filled and, for a
// method that needs code (automated test, integration), a test in test/ whose name starts with
// the REQ ID lives in a file the cell names. Any other method's Method entry is its test
// (REQ-14-1 note in docs/build/C0.md), so filled is covered. Skipped and todo tests do not count.
// The spec and matrix disagreeing, or a test citing an unknown REQ, always exits 1.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_REQ = /\*\*(REQ-\d+-\d+)\*\*/g;
const TEST_NAME = /\b(?:test|it)(?:\.only)?\(\s*["'`]((?:REQ-\d+-\d+[\s,]*)+)/g;
const TEST_FILE = /\.(?:mjs|cjs|js)$/;
const NEEDS_CODE_TEST = /automated test|integration/;

function parseArgs(argv) {
  const args = { chunk: null, strict: false, root: fileURLToPath(new URL("..", import.meta.url)) };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--strict") args.strict = true;
    else if (argv[i] === "--chunk" && argv[i + 1]) args.chunk = argv[++i];
    else if (argv[i] === "--root" && argv[i + 1]) args.root = resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

function parseSpec(root) {
  const text = readFileSync(join(root, "docs/spec.md"), "utf8");
  return [...text.matchAll(SPEC_REQ)].map((m) => m[1]);
}

function parseMatrix(root) {
  const rows = [];
  for (const line of readFileSync(join(root, "docs/build/traceability.md"), "utf8").split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    if (!/^REQ-\d+-\d+$/.test(cells[1] ?? "")) continue;
    rows.push({ req: cells[1], chunk: cells[2], method: cells[3], verifiedBy: cells[4], status: cells[5] });
  }
  return rows;
}

function listTestFiles(dir, root) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return relative(root, path).split(sep).join("/") === "test/fixtures" ? [] : listTestFiles(path, root);
    }
    return TEST_FILE.test(entry.name) ? [path] : [];
  });
}

// Map of REQ ID to the set of repo-relative test files whose test names cite it.
function parseTests(root) {
  const tests = new Map();
  let count = 0;
  for (const path of listTestFiles(join(root, "test"), root)) {
    const file = relative(root, path).split(sep).join("/");
    for (const match of readFileSync(path, "utf8").matchAll(TEST_NAME)) {
      count++;
      for (const req of match[1].match(/REQ-\d+-\d+/g)) {
        if (!tests.has(req)) tests.set(req, new Set());
        tests.get(req).add(file);
      }
    }
  }
  return { tests, count };
}

function uncoveredReason(row, tests) {
  if (!row.verifiedBy) return "blank";
  if (!NEEDS_CODE_TEST.test(row.method)) return null;
  const files = tests.get(row.req);
  if (!files) return "no test named with this REQ";
  return [...files].some((file) => row.verifiedBy.includes(file)) ? null : "Verified by names no file with its test";
}

function duplicates(items) {
  return [...new Set(items.filter((item, i) => items.indexOf(item) !== i))];
}

function integrityErrors(specReqs, rows, tests) {
  const inSpec = new Set(specReqs);
  const matrixReqs = rows.map((r) => r.req);
  const inMatrix = new Set(matrixReqs);
  return [
    ...duplicates(specReqs).map((r) => `${r}: defined more than once in the spec`),
    ...duplicates(matrixReqs).map((r) => `${r}: more than one matrix row`),
    ...specReqs.filter((r) => !inMatrix.has(r)).map((r) => `${r}: in the spec, no matrix row`),
    ...matrixReqs.filter((r) => !inSpec.has(r)).map((r) => `${r}: matrix row, not in the spec`),
    ...[...tests.keys()].filter((r) => !inSpec.has(r)).map((r) => `${r}: cited by a test, not in the spec`),
  ];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const specReqs = parseSpec(args.root);
  const rows = parseMatrix(args.root);
  const { tests, count } = parseTests(args.root);

  const chunks = new Map();
  for (const row of rows) {
    const stats = chunks.get(row.chunk) ?? { reqs: 0, filled: 0, covered: 0, uncovered: [] };
    const reason = uncoveredReason(row, tests);
    stats.reqs++;
    if (row.verifiedBy) stats.filled++;
    if (reason) stats.uncovered.push({ req: row.req, reason });
    else stats.covered++;
    chunks.set(row.chunk, stats);
  }

  console.log(`Spec: ${specReqs.length} REQs in docs/spec.md`);
  console.log(`Matrix: ${rows.length} rows in docs/build/traceability.md`);
  console.log(`Tests: ${count} test names citing REQs in test/\n`);
  const line = (...c) =>
    console.log(`${String(c[0]).padEnd(8)}${c.slice(1).map((v) => String(v).padStart(10)).join("")}`);
  line("Chunk", "REQs", "Filled", "Covered", "Uncovered");
  for (const [name, s] of chunks) line(name, s.reqs, s.filled, s.covered, s.uncovered.length);

  const errors = integrityErrors(specReqs, rows, tests);
  if (errors.length) {
    console.log(`\nIntegrity errors (${errors.length}):`);
    for (const error of errors) console.log(`  ${error}`);
  }

  let strictFailed = false;
  if (args.chunk) {
    const stats = chunks.get(args.chunk);
    console.log();
    if (!stats) {
      console.log(`${args.chunk}: no rows in the matrix`);
      strictFailed = args.strict;
    } else {
      console.log(`${args.chunk}: ${stats.filled}/${stats.reqs} rows filled, ${stats.uncovered.length} uncovered`);
      for (const { req, reason } of stats.uncovered) console.log(`  ${req}: ${reason}`);
      strictFailed = args.strict && stats.uncovered.length > 0;
    }
  } else if (args.strict) {
    console.log("\n--strict needs --chunk Cn");
    strictFailed = true;
  }

  process.exitCode = errors.length || strictFailed ? 1 : 0;
}

main();
