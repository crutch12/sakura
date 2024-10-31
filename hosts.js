const dns = require('node:dns/promises');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');

const INNO_PROXY_HOST = 'inno-proxy'

const DEFAULT_HOSTNAMES = [
  // sfera
  'sfera.inno.local',
  'git.sfera.inno.local',
  'repo-ci.sfera.inno.local',
  'npm.repo-ci.sfera.inno.local',

  // CURS stands
  'curs-root-ui.dev.curs.apps.innodev.local',
  'api-gw.dev.curs.apps.innodev.local'
]

const options = { family: 4 };

const getHostnames = async () => {
  const text = await fs.readFile(path.resolve(__dirname, './inno_hostnames.txt'), 'utf8').catch(() => undefined)

  if (typeof text === 'undefined') {
    return DEFAULT_HOSTNAMES
  }

  const hostnames = text.split('\n')
    .map(x => x.trim())
    .filter(x => !x.startsWith('#'))
    .filter(x => !x.startsWith('//'))
    .filter(x => !x.startsWith(';'))
    .map(x => x.replace(/["'\[\]]/g, ''))
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
    const { address } = await dns.lookup(host, options)
    values.push({ host, address })
  }

  if (values.length === 0) {
    throw new Error('No hosts found!')
  }

  const uniqueMap = new Map([])

  for (value of values) {
    uniqueMap.set(value.address, values.filter(x => x.address === value.address).map(x => x.host))
  }

  return '\n' + Array.from(uniqueMap.keys()).map(key => `${key} ${uniqueMap.get(key).join(' ')}`).join('\n')
}

void generate().then(console.log).catch(console.error).finally(() => process.exit())
