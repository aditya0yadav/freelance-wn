const cron = require('node-cron');
const InventoryPullService = require('../services/inventoryPullService');

// Schedule job to execute every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Starting automated survey inventory sync...`);
  try {
    await InventoryPullService.pullAll();
    console.log(`[${new Date().toISOString()}] Survey inventory sync completed successfully.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Survey sync error:`, error.message);
  }
});
