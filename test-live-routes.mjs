import https from 'https'

const urls = [
  'https://kizen-crm-henna.vercel.app/',
  'https://kizen-crm-henna.vercel.app/dashboard',
  'https://kizen-crm-henna.vercel.app/leads',
  'https://kizen-crm-henna.vercel.app/calendar',
  'https://kizen-crm-henna.vercel.app/settings',
]

async function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const hasRoot = data.includes('<div id="root"></div>')
        resolve({ url, statusCode: res.statusCode, hasRoot })
      })
    }).on('error', (err) => {
      resolve({ url, statusCode: 500, error: err.message })
    })
  })
}

async function run() {
  console.log('=== TESTING LIVE VERCEL SPA ROUTES ===\n')
  for (const url of urls) {
    const result = await checkUrl(url)
    if (result.statusCode === 200 && result.hasRoot) {
      console.log(`✅ SUCCESS (HTTP 200 OK): ${result.url} -> Serves index.html correctly!`)
    } else {
      console.log(`❌ FAIL (HTTP ${result.statusCode}): ${result.url}`)
    }
  }
}

run()
