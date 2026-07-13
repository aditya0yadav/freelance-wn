const axios = require('axios');

const key = '0AgQ3A2yuJ0j3Tr0FQGT4bdNZaj0Tnw4';

async function testLangs() {
  const url = 'https://surveysupply.zamplia.com/api/v1/Surveys/GetLanguages';
  try {
    const res = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'ZAMP-KEY': key
      },
      timeout: 10000
    });
    console.log('Languages:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log('Failed:', e.message);
  }
}

testLangs();
