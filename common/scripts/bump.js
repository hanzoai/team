const fs = require('fs')
const execSync = require('child_process').execSync
const path = require('path')
const repo = '@hanzo'

const packages = {}
const jsons = {}

/**
 * Populate packages and jsons from rush.json configuration
 */
function fillPackages() {
  const rushJson = path.resolve(__dirname, '..', '..', 'rush.json')
  const config = JSON.parse(fs.readFileSync(rushJson, 'utf-8'))
  for (const pkg of config.projects) {
    const name = pkg.packageName
    const projectFolder = pkg.projectFolder
    // Track publishable flag
    packages[name] = { path: projectFolder, shouldPublish: pkg.shouldPublish === true }
    // Load package.json
    const pkgPath = path.resolve(__dirname, '..', '..', projectFolder, 'package.json')
    jsons[name] = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  }
}

function bumpPackage (name, newVersion) {
  const json = jsons[name]

  json.version = newVersion
  if (typeof json.dependencies === 'object') {
    for (const [dependency] of Object.entries(json.dependencies)) {
      if (packages[dependency] !== undefined) {
        json.dependencies[dependency] = `^${newVersion}`
      }
    }
  }
}

/**
 * Determine if a package should be published based on rush.json flag
 */
function shouldPublish(name) {
  return packages[name] && packages[name].shouldPublish
}

function publish (name) {
  const package = packages[name]
  try {
    console.log('publishing', name)
    execSync(`cd ${package.path} && npm publish && cd ../..`, { encoding: 'utf-8' })
  } catch (err) {
    console.log(err)
  }
}

function fix (name) {
  const package = packages[name]
  try {
    console.log('fixing', name)
    execSync(`cd ${package.path} && npm pkg fix && cd ../..`, { encoding: 'utf-8' })
  } catch (err) {
    console.log(err)
  }
}

function main () {
  const args = process.argv

  const doFix = args.includes('--fix')
  const doPublish = args.includes('--publish')

  const version = args.reverse().shift()
  if (version === undefined || version === '') {
    console.log('usage: node bump.js [--publish] <version>')
    return
  }
  if( !/^(\d+\.)?(\d+\.)?(\*|\d+)$/.test(version)) {
    console.log('Invalid <version>', version, ' should be xx.xx.xx')
    return
  }

  console.log('bump version ...', version)

  const config = JSON.parse(execSync('rush list -p --json', { encoding: 'utf-8' }))

  fillPackages(config)

  const packageNames = Object.keys(packages)
  for (const packageName of packageNames) {
    bumpPackage(packageName, version)
  }

  for (const packageName of packageNames) {
    const package = packages[packageName]
    const file = package.path + '/package.json'
    const res = JSON.stringify(jsons[packageName], undefined, 2)
    fs.writeFileSync(file, res + '\n')
  }
  if (doFix) {
    for (const packageName of packageNames) {
      if (shouldPublish(packageName)) {
        fix(packageName)
      }
    }
  }
  if (doPublish) {
    for (const packageName of packageNames) {
      if (shouldPublish(packageName)) {
        publish(packageName)
      }
    }
  }

  console.log('... done')
}

main ()
