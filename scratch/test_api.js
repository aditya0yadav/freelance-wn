const axios = require('axios');

async function test() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://127.0.0.1:8000/api/member/platform/login', {
      username: 'Demo Member',
      password: '123456'
    });
    
    console.log('Login Result:', loginRes.data);
    const token = loginRes.data.data.token;
    
    console.log('\nFetching platforms...');
    const listRes = await axios.get('http://127.0.0.1:8000/api/member/platform/list', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Platform List count:', listRes.data.data?.length);
    console.log('Platform List Sample:', JSON.stringify(listRes.data.data?.[0], null, 2));

    if (listRes.data.data?.[0]) {
      const pid = listRes.data.data[0].platform_id;
      console.log(`\nFetching offers for platform #${pid}...`);
      const offersRes = await axios.get(`http://127.0.0.1:8000/api/member/platform/offers?platform_id=${pid}&page=1&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Offers count:', offersRes.data.data?.list?.length);
      console.log('Offers Sample:', JSON.stringify(offersRes.data.data?.list?.[0], null, 2));
    }
  } catch (e) {
    console.error('Error during API test:', e.response ? e.response.data : e.message);
  }
}

test();
