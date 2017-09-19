const replace = require("replace")
const childProcess = require("child_process")
const fs = require("fs")
const argv = process.argv.slice(2)

const replaceAtoB = function(reg, prod, forWhat = "", where = null) {
  console.log(`[INFO] Replace ${forWhat}: ${reg} → ${prod}`)
  where = where || `${__dirname}/../src/reducers/index.js`
  replace({
    regex: reg,
    replacement: prod,
    paths: [where],
    recursive: true,
    silent: true
  })
}

let _c = {}
let configFile = argv[0]
if (configFile) {
  let hasConfigJsEnding = configFile.includes(".config.js")
  // Auto add ending
  if (!hasConfigJsEnding) configFile = `${configFile}.config.js`
  _c = require(`./${configFile}`)
}
console.log(configFile, _c)

let reglocal = "localhost:8080"
let prodHost = _c.prodHost || reglocal

let regPrinterIp = "192.168.1.9"
let prodPrinterIp = _c.prodPrinterIp || regPrinterIp

let regVersion = "VERSION"
let prodVersion = childProcess.execSync("git log --pretty=format:%h -n 1").toString()

let regAdminPass, prodAdminPass, whereAminPass
if (_c.adminPass) {
  regAdminPass = "aaa"
  prodAdminPass = _c.adminPass
  whereAminPass = `${__dirname}/../src/actions/index.js`
}

let regPrintImage, prodPrintImage
if (_c.canPrintImage) {
  regPrintImage = "canPrintImage: false,"
  prodPrintImage = "canPrintImage: true,"
}

let regHomePage, prodHomePage, whereHomePage
if (_c.homepage) {
  regHomePage = "http://pos.tinker.press"
  prodHomePage = _c.homepage
  whereHomePage = `${__dirname}/../package.json`
}

// Replace for prod
replaceAtoB(reglocal, prodHost, "hostname")
replaceAtoB(regPrinterIp, prodPrinterIp, "printer ip")
replaceAtoB(regVersion, prodVersion, "version")
if (_c.adminPass) replaceAtoB(regAdminPass, prodAdminPass, "admin pass", whereAminPass)
if (_c.canPrintImage) replaceAtoB(regPrintImage, prodPrintImage, "print image")

// Build
console.log(`[INFO] Run buid`)
const buildLog = childProcess.execSync("yarn _build").toString()
console.log(`[INFO] Build log: ${buildLog}`)

// Copy .htaccess
const cpHtaccessLog = childProcess.execSync("cp .htaccess build/")
console.log(`[INFO] Copy .htaccess log: ${cpHtaccessLog}`)

// Upload
console.log(`[INFO] Upload build file`)
// This batch file do:
// 1. -mkdir (silent fail IF dir already exist)
// 2. put file
const uploadBatchFile = `
#!/usr/bin/env bash
-mkdir ${_c.uploadTo}
-mkdir ${_c.uploadTo}/static
put -R build/* ${_c.uploadTo}
exit`
// Create upload batch file
const uploadBatchFilePath = `${__dirname}/uploadBatchFile.config.sh`
fs.writeFileSync(uploadBatchFilePath, uploadBatchFile)
const uploadLog = childProcess.execSync(`sftp -b ${uploadBatchFilePath} root@${_c.remoteHost}`)
console.log(`[INFO] Upload log: ${uploadLog}`)
// Delete tmp upload batch file
fs.unlinkSync(uploadBatchFilePath)

// Reverse
replaceAtoB(prodHost, reglocal, "hostname")
replaceAtoB(prodPrinterIp, regPrinterIp, "printer ip")
replaceAtoB(prodVersion, regVersion, "version")
if (_c.adminPass) replaceAtoB(prodAdminPass, regAdminPass, "admin pass", whereAminPass)
if (_c.canPrintImage) replaceAtoB(prodPrintImage, regPrintImage, "print image")
if (_c.homepage) replaceAtoB(prodHomePage, regHomePage, "homepage", whereHomePage)
