const axios = require('axios');
const crypto = require('crypto');
const net = require('net');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// Accurate provider definitions discovered via live tests
const PROXY_PROVIDERS = [
  {
    key: 'smart',
    name: 'Smart (ipipbright)',
    host: process.env.SMART_PROXY_HOST || 'sp.ipipbright.net',
    port: parseInt(process.env.SMART_PROXY_PORT, 10) || 1000,
    user: process.env.SMART_PROXY_USER || 'storm-fengchuiguo',
    password: process.env.SMART_PROXY_PASS || 'fcg123456',
    // ipipbright uses underscore "_" delimiter for parameters
    formatLogin: (baseUser, country, sessionId) => {
      const c = (country || 'US').toUpperCase();
      const s = sessionId || crypto.randomBytes(4).toString('hex');
      return `${baseUser}_country-${c}_session-${s}`;
    }
  },
  {
    key: 'koo',
    name: 'Koo (Kookeey)',
    host: process.env.KOO_PROXY_HOST || 'gate.kookeey.info',
    port: parseInt(process.env.KOO_PROXY_PORT, 10) || 1000,
    user: process.env.KOO_PROXY_USER || '8162185-995261',
    password: process.env.KOO_PROXY_PASS || 'zzz123456',
    // Kookeey uses "-country-XX"
    formatLogin: (baseUser, country) => {
      const c = (country || 'US').toUpperCase();
      return `${baseUser}-country-${c}`;
    }
  }
];

// 1. TCP Gateway Ping test
function testTcpGateway(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const latency = Date.now() - startTime;
      isResolved = true;
      socket.destroy();
      resolve({ success: true, latency });
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        resolve({ success: false, error: err.message });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ success: false, error: 'Connection timed out' });
      }
    });
  });
}

// 2. HTTP/HTTPS Egress test through proxy
async function testProxyEgress(provider, country = 'US') {
  const sessionId = crypto.randomBytes(4).toString('hex');
  const username = provider.formatLogin(provider.user, country, sessionId);
  const startTime = Date.now();

  try {
    const res = await axios.get('http://ip-api.com/json', {
      proxy: {
        host: provider.host,
        port: provider.port,
        auth: {
          username,
          password: provider.password
        }
      },
      timeout: 10000
    });

    const elapsed = Date.now() - startTime;
    return {
      success: true,
      data: res.data,
      elapsed,
      username
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
      username
    };
  }
}

// Main execution
(async () => {
  console.log('===============================================================');
  console.log('          RESIDENTIAL PROXY CONNECTIVITY & EGRESS CHECK        ');
  console.log('===============================================================\n');

  for (const provider of PROXY_PROVIDERS) {
    console.log(`---------------------------------------------------------------`);
    console.log(`Checking Provider: [${provider.name}]`);
    console.log(`Gateway: ${provider.host}:${provider.port}`);
    console.log(`Base User: ${provider.user}`);

    // A. Check Gateway TCP connectivity
    process.stdout.write(`  [1] Gateway Ping (${provider.host}:${provider.port})... `);
    const tcp = await testTcpGateway(provider.host, provider.port);
    if (tcp.success) {
      console.log(`✅ REACHABLE (${tcp.latency}ms)`);
    } else {
      console.log(`❌ UNREACHABLE (${tcp.error})`);
    }

    // B. Test Egress for multiple countries
    const countriesToTest = ['US', 'GB'];
    for (const c of countriesToTest) {
      process.stdout.write(`  [2] Testing Egress for Country [${c}]... `);
      const egress = await testProxyEgress(provider, c);

      if (egress.success) {
        console.log(`✅ WORKING! (${egress.elapsed}ms)`);
        console.log(`      • Exit IP:     ${egress.data.query}`);
        console.log(`      • Country:     ${egress.data.country} (${egress.data.countryCode})`);
        console.log(`      • City:        ${egress.data.city || 'N/A'}`);
        console.log(`      • ISP:         ${egress.data.isp || 'N/A'}`);
        console.log(`      • Org:         ${egress.data.org || 'N/A'}`);
        console.log(`      • Auth User:   ${egress.username}`);
      } else {
        console.log(`❌ FAILED!`);
        console.log(`      • Error:       ${egress.error}`);
        console.log(`      • Auth User:   ${egress.username}`);
      }
    }
    console.log('');
  }

  console.log('===============================================================');
  console.log('                      TEST COMPLETED                           ');
  console.log('===============================================================');
})();
