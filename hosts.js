const dns = require('node:dns/promises');
const os = require('node:os');

const INNO_PROXY_HOST = 'inno-proxy'

const hosts = [
  // sfera
  'sfera.inno.local',
  'git.sfera.inno.local',
  'repo-ci.sfera.inno.local',
  'npm.repo-ci.sfera.inno.local',

  // stands
  'curs-root-ui.dev.curs.apps.innodev.local',
  'api-gw.dev.curs.apps.innodev.local',

  // CURS swaggers
  'contractor.dev.curs.apps.innodev.local',
  'compendium.dev.curs.apps.innodev.local',
  'curs-opsnext.dev.curs.apps.innodev.local',
  'deals-and-limits.dev.curs.apps.innodev.local',
  'deals-and-limits-integration.dev.curs.apps.innodev.local',
  'decision.dev.curs.apps.innodev.local',
  'dfbs.dev.curs.apps.innodev.local',
  'dfbs-control.dev.curs.apps.innodev.local',
  'dfbs-mb.dev.curs.apps.innodev.local',
  'document-search.dev.curs.apps.innodev.local',
  'etl-integration.dev.curs.apps.innodev.local',
  'incident.dev.curs.apps.innodev.local',
  'kantor-curs.dev.curs.apps.innodev.local',
  'monitoring.dev.curs.apps.innodev.local',
  'migrate-spkp-curs.dev.curs.apps.innodev.local',
  'notification.dev.curs.apps.innodev.local',
  'orchestrator.dev.curs.apps.innodev.local',
  'osfp-integration.dev.curs.apps.innodev.local',
  'pp-integration.dev.curs.apps.innodev.local',
  'report.dev.curs.apps.innodev.local',
  'role-model.dev.curs.apps.innodev.local',
]

const options = { family: 4 };

const generate = async (hosts) => {
  const { address: eth0Address } = os.networkInterfaces().eth0 && os.networkInterfaces().eth0.find(x => x.family === 'IPv4') || {}

  const values = []

  if (eth0Address) {
    values.push({ host: INNO_PROXY_HOST, address: eth0Address })
  }

  for (const host of hosts) {
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

void generate(hosts).then(console.log).catch(console.error).finally(() => process.exit())