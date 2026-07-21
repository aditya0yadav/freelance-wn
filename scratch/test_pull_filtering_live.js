const axios = require('axios');

const key = 'tb3qsBUFw7dpPfZeuS2GEKYQhTHAnmkxr5MDWa6C4z9v8gRVyc';
const aid = '1930';
const surveysUrl = 'https://api.gowebsurveys.com/suppliers/v2/surveys';
const quotaUrl = 'https://api.gowebsurveys.com/suppliers/v2/quotaStatus';

async function testLivePull() {
  console.log('Fetching live surveys from GoWebSurveys...');
  try {
    const res = await axios.get(surveysUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': key,
        'payload': aid
      },
      timeout: 30000
    });

    if (!res.data || !res.data.surveys) {
      console.log('Failed to fetch surveys or no surveys returned:', res.data);
      return;
    }

    const allSurveys = res.data.surveys;
    console.log(`Successfully fetched ${allSurveys.length} surveys from the GoWebSurveys API.`);

    console.log('Checking status in batches of 25...');
    const liveSurveys = [];
    const statusCounts = {};

    const batchSize = 25;
    for (let i = 0; i < allSurveys.length; i += batchSize) {
      const batch = allSurveys.slice(i, i + batchSize);
      const surveyIDs = batch.map(s => s.surveyID).join(',');

      console.log(`Polling batch ${Math.floor(i / batchSize) + 1} (${batch.length} surveys)...`);
      try {
        const quotaRes = await axios.post(quotaUrl, {
          surveyIDs: surveyIDs
        }, {
          headers: {
            'Accept': 'application/json',
            'Authorization': key,
            'payload': aid,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        if (quotaRes.data && quotaRes.data.apiStatus === 1 && quotaRes.data.surveyInfo) {
          const surveyInfoList = quotaRes.data.surveyInfo;
          surveyInfoList.forEach(info => {
            const status = info.surveyStatus;
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            if (Number(status) === 2) {
              liveSurveys.push(info);
            }
          });
        } else {
          console.log(`Batch ${Math.floor(i / batchSize) + 1} failed:`, quotaRes.data);
        }
      } catch (err) {
        console.error(`Failed to fetch status for batch starting at index ${i}:`, err.message);
      }

      // Add a small delay between requests to be gentle on the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n--- Live Run Summary ---');
    console.log(`Total surveys fetched: ${allSurveys.length}`);
    console.log(`Total surveys status-checked: ${Object.values(statusCounts).reduce((a, b) => a + b, 0)}`);
    console.log('Status Distribution:', statusCounts);
    console.log(`Live surveys (status 2): ${liveSurveys.length}`);

    if (liveSurveys.length > 0) {
      console.log('\nFirst 5 Live Surveys Sample:');
      liveSurveys.slice(0, 5).forEach(survey => {
        console.log(`- ID: ${survey.surveyID}, CPI: ${survey.surveyCPI}, Target Count: ${survey.surveyTargetCount}`);
      });
    }

  } catch (e) {
    console.error('Error during live run:', e.message);
  }
}

testLivePull();
