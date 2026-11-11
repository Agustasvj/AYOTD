import fs from "fs";
import path from "path";
import ts from "typescript";
import { execSync } from "child_process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, ".test-dist");

// Clean and recreate dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  });
  return results;
}

const sourceFiles = [
  ...getFiles(path.join(rootDir, "lib")),
  ...getFiles(path.join(rootDir, "tests"))
];

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true
};

console.log(`\nCompiling ${sourceFiles.length} TypeScript files for testing (CJS mode)...`);

for (const src of sourceFiles) {
  const rel = path.relative(rootDir, src);
  const outPath = path.join(distDir, rel).replace(/\.ts$/, ".js");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const code = fs.readFileSync(src, "utf-8");
  const output = ts.transpileModule(code, { compilerOptions });
  fs.writeFileSync(outPath, output.outputText);
}

// Write package.json with commonjs
fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2)
);

console.log("Running automated tests with Node.js test runner...\n");

try {
  execSync("node --test .test-dist/tests/*.test.js", {
    stdio: "inherit",
    cwd: rootDir
  });
  console.log("\nAll AYOTD automated tests passed successfully!\n");
} catch (e) {
  process.exit(1);
}
