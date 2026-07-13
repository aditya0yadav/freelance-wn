const axios = require('axios');

const key = 'tb3qsBUFw7dpPfZeuS2GEKYQhTHAnmkxr5MDWa6C4z9v8gRVyc';
const aid = '1930';
const surveyId = 151843;

async function testQuotaPayload() {
  const url = 'https://api.gowebsurveys.com/suppliers/v2/quotaStatus';

  // Test 1: As single ID (number)
  try {
    const res = await axios.post(url, {
      surveyIDs: surveyId
    }, {
      headers: {
        'Accept': 'application/json',
        'Authorization': key,
        'payload': aid,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('Single ID Response apiStatus:', res.data.apiStatus);
    console.log('Single ID Response data:', JSON.stringify(res.data));
  } catch (e) {
    console.log('Single ID failed:', e.message);
  }

  // Test 2: As array [surveyId]
  try {
    const res2 = await axios.post(url, {
      surveyIDs: [surveyId]
    }, {
      headers: {
        'Accept': 'application/json',
        'Authorization': key,
        'payload': aid,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    console.log('Array ID Response apiStatus:', res2.data.apiStatus);
    console.log('Array ID Response data:', JSON.stringify(res2.data));
  } catch (e) {
    console.log('Array ID failed:', e.message);
  }
}

testQuotaPayload();
