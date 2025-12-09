#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Script para verificar se todos os imports têm dependências correspondentes no package.json
 * Executar com: node scripts/check-dependencies.js
 */

function getPackageJson() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.error("package.json não encontrado");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function getAllTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (
      stat.isDirectory() &&
      !item.startsWith(".") &&
      item !== "node_modules"
    ) {
      getAllTsxFiles(fullPath, files);
    } else if (stat.isFile() && item.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImports(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function checkDependencies() {
  const packageJson = getPackageJson();
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const srcDir = path.join(process.cwd(), "src");
  const tsxFiles = getAllTsxFiles(srcDir);

  const missingDeps = new Set();
  const foundImports = new Set();

  for (const file of tsxFiles) {
    const imports = extractImports(file);
    for (const importPath of imports) {
      // Ignorar imports relativos, aliases do TypeScript e do Node.js
      if (
        importPath.startsWith(".") ||
        importPath.startsWith("/") ||
        importPath.startsWith("@/") ||
        importPath.startsWith("@types/") ||
        importPath.startsWith("node:")
      ) {
        continue;
      }

      // Extrair nome do pacote (remover subpaths)
      const packageName = importPath.split("/")[0];
      if (packageName.startsWith("@")) {
        // Scoped package, pegar @scope/package
        const parts = importPath.split("/");
        const scopedPackage = parts.slice(0, 2).join("/");
        foundImports.add(scopedPackage);
        if (!allDeps[scopedPackage]) {
          missingDeps.add(scopedPackage);
        }
      } else {
        foundImports.add(packageName);
        if (!allDeps[packageName]) {
          missingDeps.add(packageName);
        }
      }
    }
  }

  console.log(`Verificando ${tsxFiles.length} arquivos TSX...`);
  console.log(
    `Encontrados ${foundImports.size} imports únicos de pacotes externos.`
  );

  if (missingDeps.size > 0) {
    console.error("\n❌ Dependências faltantes encontradas:");
    for (const dep of missingDeps) {
      console.error(`  - ${dep}`);
    }
    console.error("\nExecute: pnpm add " + Array.from(missingDeps).join(" "));
    process.exit(1);
  } else {
    console.log("\n✅ Todas as dependências estão instaladas!");
  }
}

if (require.main === module) {
  checkDependencies();
}

module.exports = { checkDependencies };
