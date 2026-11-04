import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export async function resolve(specifier, context, nextResolve) {
  if(specifier.endsWith('/freshSocieties')||specifier.endsWith('/freshSocieties.ts'))return nextResolve(new URL('./fixtures/freshSocieties.ts',import.meta.url).href,context);
  // Legacy domain tests explicitly use an isolated catalog fixture, never shipped by Vite.
  if(specifier.endsWith('/data/catalog')||specifier.endsWith('/data/catalog.ts')) return nextResolve(new URL('./fixtures/catalog.ts',import.meta.url).href,context);

  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return await nextResolve(specifier + '.ts', context) } catch {}
  }
  return nextResolve(specifier, context)
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const source = await readFile(fileURLToPath(url), 'utf8')
    return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText }
  }
  return nextLoad(url, context)
}
