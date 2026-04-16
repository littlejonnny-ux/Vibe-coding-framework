const fs = require('fs');
const path = require('path');

function detectProjectType() {
  const cwd = process.cwd();
  const languages = [];
  const frameworks = [];

  if (fileExists(cwd, 'tsconfig.json') || fileExists(cwd, 'tsconfig.base.json')) {
    languages.push('TypeScript');
  }
  if (fileExists(cwd, 'package.json')) {
    languages.push('JavaScript');
  }
  if (fileExists(cwd, 'requirements.txt') || fileExists(cwd, 'pyproject.toml') || fileExists(cwd, 'setup.py')) {
    languages.push('Python');
  }
  if (fileExists(cwd, 'go.mod')) languages.push('Go');
  if (fileExists(cwd, 'Cargo.toml')) languages.push('Rust');

  const pkg = readPackageJson(cwd);
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps['next']) frameworks.push('Next.js');
    if (allDeps['react'] && !allDeps['next']) frameworks.push('React');
    if (allDeps['vue']) frameworks.push('Vue');
    if (allDeps['svelte'] || allDeps['@sveltejs/kit']) frameworks.push('Svelte');
    if (allDeps['express']) frameworks.push('Express');
    if (allDeps['fastify']) frameworks.push('Fastify');
    if (allDeps['@supabase/supabase-js']) frameworks.push('Supabase');
    if (allDeps['tailwindcss']) frameworks.push('Tailwind CSS');
    if (allDeps['prisma'] || allDeps['@prisma/client']) frameworks.push('Prisma');
    if (allDeps['drizzle-orm']) frameworks.push('Drizzle');
    if (allDeps['@playwright/test']) frameworks.push('Playwright');
  }

  if (fileExists(cwd, 'supabase', 'config.toml')) {
    if (!frameworks.includes('Supabase')) frameworks.push('Supabase');
  }

  return { languages, frameworks };
}

function fileExists(...parts) {
  return fs.existsSync(path.join(...parts));
}

function readPackageJson(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

module.exports = { detectProjectType };
