const assert = require('assert');
const axios = require('axios');

// Mock prisma and saveOffers
const prismaMock = {
  project: {
    updateMany: async () => ({ count: 0 })
  }
};

const InventoryPullService = require('../src/services/inventoryPullService');

// Stub saveOffers and prisma dependency in the service
let savedOffers = null;
InventoryPullService.saveOffers = async (platformId, currencyId, offers) => {
  savedOffers = offers;
};

// Override axios methods to mock API responses
let axiosGetCalls = [];
let axiosPostCalls = [];

axios.get = async (url, config) => {
  axiosGetCalls.push({ url, config });
  // Return 55 mock surveys
  const surveys = [];
  for (let i = 1; i <= 55; i++) {
    surveys.push({
      surveyID: i,
      countrieISOcode: 'US',
      surveyCPI: 1.5,
      LOI: 10,
      IR: 80,
      surveyTargetCount: 100
    });
  }
  return { data: { surveys } };
};

axios.post = async (url, data, config) => {
  axiosPostCalls.push({ url, data, config });
  
  // Return status 2 for even IDs, status 1 for odd IDs
  const surveyIDs = data.surveyIDs.split(',').map(Number);
  const surveyInfo = surveyIDs.map(id => ({
    surveyID: String(id),
    surveyStatus: id % 2 === 0 ? 2 : 1
  }));

  return {
    data: {
      apiStatus: 1,
      surveyInfo
    }
  };
};

async function runMockTest() {
  console.log('Starting mock test for GoWebSurveys pull...');

  const mockPlatform = {
    platform_id: 1,
    platform_name: 'GoWebSurveys',
    platform_sign: 'Gowebsurveys',
    platform_url: 'https://api.gowebsurveys.com/suppliers/v2/surveys',
    platform_quota_url: 'https://api.gowebsurveys.com/suppliers/v2/quotaStatus'
  };

  const mockParams = {
    app_key: 'test_key',
    app_id: 'test_id'
  };

  const mockCurrency = {
    currency_id: 2,
    currency_code: 'USD'
  };

  await InventoryPullService.pullGowebsurveys(mockPlatform, mockParams, mockCurrency);

  // Assertions
  console.log('\n--- Assertions ---');
  
  // 1. Should have made 1 GET call to fetch surveys
  assert.strictEqual(axiosGetCalls.length, 1);
  console.log('✓ Correctly called GET to fetch surveys.');

  // 2. Should have made 3 POST calls to quotaStatus (55 surveys / 25 batch size = 3 batches)
  assert.strictEqual(axiosPostCalls.length, 3);
  console.log('✓ Correctly batched quotaStatus calls (3 requests for 55 surveys).');

  // Verify batch details
  assert.strictEqual(axiosPostCalls[0].data.surveyIDs, Array.from({length: 25}, (_, i) => i + 1).join(','));
  assert.strictEqual(axiosPostCalls[1].data.surveyIDs, Array.from({length: 25}, (_, i) => i + 26).join(','));
  assert.strictEqual(axiosPostCalls[2].data.surveyIDs, Array.from({length: 5}, (_, i) => i + 51).join(','));
  console.log('✓ QuotaStatus request payloads had the expected batches of IDs.');

  // 3. Only even IDs should have been saved because odd ones had status 1 (not 2)
  assert.ok(savedOffers);
  const oddSaved = savedOffers.filter(o => Number(o.project_no) % 2 !== 0);
  const evenSaved = savedOffers.filter(o => Number(o.project_no) % 2 === 0);

  assert.strictEqual(oddSaved.length, 0, 'No odd IDs should be saved');
  assert.strictEqual(evenSaved.length, 27, 'All 27 even IDs (2 to 54) should be saved');
  console.log('✓ Successfully filtered out surveys whose surveyStatus was not 2.');
  console.log(`✓ Saved ${evenSaved.length} live surveys out of 55.`);

  console.log('\nAll mock tests passed successfully!');
}

runMockTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
