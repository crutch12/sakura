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

  return '\n### hosts.js - start ###\n' + Array.from(uniqueMap.keys()).map(key => `${key} ${uniqueMap.get(key).join(' ')}`).join('\n') + '\n### hosts.js - end ###\n'
}

const [, , ...args] = process.argv

const WSL_WINDOWS_HOSTS_FILE = '/mnt/c/Windows/System32/drivers/etc/hosts'

void generate().then(async (result) => {
  console.log(result)
  if (args.includes('--save')) {
    console.log('\nTrying to save (rewrite) result to', WSL_WINDOWS_HOSTS_FILE)
    await fs.writeFile(WSL_WINDOWS_HOSTS_FILE, result, 'utf8')
    console.log('\nSuccess!')
  }
  else if (args.includes('--append')) {
    console.log('\nTrying to add (append) result to', WSL_WINDOWS_HOSTS_FILE)
    await fs.appendFile(WSL_WINDOWS_HOSTS_FILE, result, 'utf8')
    console.log('\nSuccess!')
  }
})
