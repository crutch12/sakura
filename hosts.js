const dns = require('node:dns/promises')
const os = require('node:os')
const fs = require('node:fs/promises')
const path = require('node:path')

const INNO_PROXY_HOST = 'inno-proxy'

const DEFAULT_HOSTNAMES = [
  // sfera
  'sfera.inno.local',
  'git.sfera.inno.local',
  'repo-ci.sfera.inno.local',
  'npm.repo-ci.sfera.inno.local',
  'docker.repo-ci.sfera.inno.local',
  'maven.repo-ci.sfera.inno.local',

  // CURS stands
  'curs-root-ui.dev.curs.apps.innodev.local',
  'api-gw.dev.curs.apps.innodev.local'
]

const START_TAG = '### hosts.js - start ###'
const END_TAG = '### hosts.js - end ###'

const getHostnames = async () => {
  const text = await fs.readFile(path.resolve(__dirname, './inno_hostnames.txt'), 'utf8').catch(() => undefined)

  if (typeof text === 'undefined') {
    return DEFAULT_HOSTNAMES
  }

  const hostnames = text.split('\n')
    .map(x => x.trim())
    .map(x => x.replace(/#.*/, '')) // remove comments - #
    .map(x => x.replace(/\/\/.*/, '')) // remove comments - //
    .map(x => x.replace(/;.*/, '')) // remove comments - ;
    .map(x => x.replace(/[,"'\[\]\(\)\{\}]/g, '')) // remove extra symbols - ,"'[](){}
    .map(x => x.trim())
    .filter(Boolean)

  return hostnames
}

const generate = async () => {
  const { address: eth0Address } = os.networkInterfaces().eth0 && os.networkInterfaces().eth0.find(x => x.family === 'IPv4') || {}

  const values = []

  if (eth0Address) {
    values.push({ host: INNO_PROXY_HOST, address: eth0Address })
  }

  const hostnames = await getHostnames()

  for (const host of hostnames) {
    const { address } = await dns.lookup(host, { family: 4 })
    values.push({ host, address })
  }

  if (values.length === 0) {
    throw new Error('No hosts found!')
  }

  const uniqueMap = new Map([])

  for (value of values) {
    uniqueMap.set(value.address, values.filter(x => x.address === value.address).map(x => x.host))
  }

  return `${START_TAG}\n` + Array.from(uniqueMap.keys()).map(key => `${key} ${uniqueMap.get(key).join(' ')}`).join('\n') + `\n${END_TAG}`
}

const [, , ...args] = process.argv

const WSL_WINDOWS_HOSTS_FILE = '/mnt/c/Windows/System32/drivers/etc/hosts'

void generate().then(async (result) => {
  console.log('\n' + result + '\n')

  if (args.includes('--save')) {
    console.log('\nTrying to save result to', WSL_WINDOWS_HOSTS_FILE)

    const content = await fs.readFile(WSL_WINDOWS_HOSTS_FILE, 'utf8')
    const rows = content.split('\n').map(x => x.trim())
    const start = rows.indexOf(START_TAG)
    const end = rows.indexOf(END_TAG)

    if (start >= 0 && end > start) { // replace
      const before = rows.slice(0, start).join('\n')
      const after = rows.slice(end + 1).join('\n')
      await fs.writeFile(WSL_WINDOWS_HOSTS_FILE, before + '\n' + result + '\n' + after, 'utf8')
    }
    else { // append
      await fs.writeFile(WSL_WINDOWS_HOSTS_FILE, content + '\n\n' + result + '\n', 'utf8')
    }

    console.log('\nSuccess!')
  }
})
