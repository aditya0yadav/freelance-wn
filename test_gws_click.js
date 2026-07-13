const axios = require('axios');

const key = 'tb3qsBUFw7dpPfZeuS2GEKYQhTHAnmkxr5MDWa6C4z9v8gRVyc';
const aid = '1930';
const surveyId = 501;

async function testClickUrl() {
  const urls = [
    'https://api.gowebsurveys.com/suppliers/v2/click',
    'https://api.gowebsurveys.com/suppliers/v2/register'
  ];

  const postData = {
    surveyID: surveyId,
    SuccessLink: "http://localhost:8000/api/callback?platform=Gowebsurveys&uid=test_uid&status=C",
    disQualifiedLink: "http://localhost:8000/api/callback?platform=Gowebsurveys&uid=test_uid&status=S",
    TermLink: "http://localhost:8000/api/callback?platform=Gowebsurveys&uid=test_uid&status=T",
    OverQuotaLink: "http://localhost:8000/api/callback?platform=Gowebsurveys&uid=test_uid&status=Q",
    useStaticLink: 0
  };

  for (const url of urls) {
    try {
      console.log(`Testing URL: ${url}`);
      const res = await axios.post(url, postData, {
        headers: {
          'Accept': 'application/json',
          'Authorization': key,
          'payload': aid,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });
      console.log(`Success for ${url}:`, res.data);
    } catch (e) {
      console.log(`Error for ${url}:`, e.response ? e.response.status : e.message, e.response ? e.response.data : '');
    }
  }
}

testClickUrl();
