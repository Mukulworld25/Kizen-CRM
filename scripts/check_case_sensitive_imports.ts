import fs from 'fs'
import path from 'path'

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        getAllFiles(fullPath, arrayOfFiles)
      }
    } else {
      arrayOfFiles.push(fullPath)
    }
  })

  return arrayOfFiles
}

const srcDir = path.resolve(process.cwd(), 'src')
const allFiles = getAllFiles(srcDir)
const fileSet = new Set(allFiles.map(f => path.normalize(f)))

console.log(`Found ${allFiles.length} files in src. Checking case-sensitive imports...`)

let errorsFound = 0

allFiles.forEach((file) => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return
  const content = fs.readFileSync(file, 'utf8')
  const importRegex = /from\s+['"](@\/[^'"]+|..\/[^'"]+|\.\/[^'"]+)['"]/g
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]
    let resolvedPath = ''
    if (importPath.startsWith('@/')) {
      resolvedPath = path.join(srcDir, importPath.slice(2))
    } else {
      resolvedPath = path.resolve(path.dirname(file), importPath)
    }

    // Try extensions .ts, .tsx, /index.ts, /index.tsx
    const exts = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
    let foundExact = false
    let foundCaseMismatch: { imported: string; actualOnDisk: string } | null = null

    for (const ext of exts) {
      const candidate = resolvedPath + ext
      if (fs.existsSync(candidate)) {
        // Check exact casing on disk
        const dir = path.dirname(candidate)
        const base = path.basename(candidate)
        if (fs.existsSync(dir)) {
          const actualFiles = fs.readdirSync(dir)
          if (actualFiles.includes(base)) {
            foundExact = true;
            break;
          } else {
            const actualBase = actualFiles.find(f => f.toLowerCase() === base.toLowerCase())
            if (actualBase) {
              foundCaseMismatch = { imported: base, actualOnDisk: actualBase }
            }
          }
        }
      }
    }

    if (!foundExact) {
      if (foundCaseMismatch) {
        console.error(`❌ CASE MISMATCH in ${path.relative(process.cwd(), file)}:`)
        console.error(`   Imported: "${importPath}" (basename: "${foundCaseMismatch.imported}")`)
        console.error(`   Actual on disk: "${foundCaseMismatch.actualOnDisk}"\n`)
        errorsFound++
      } else {
        console.error(`❌ MISSING FILE in ${path.relative(process.cwd(), file)}:`)
        console.error(`   Imported: "${importPath}" -> Could not resolve on disk\n`)
        errorsFound++
      }
    }
  }
})

if (errorsFound === 0) {
  console.log('✅ ALL IMPORTS MATCH EXACT CASING ON DISK!')
} else {
  console.log(`❌ Found ${errorsFound} import errors / case mismatches!`)
}
