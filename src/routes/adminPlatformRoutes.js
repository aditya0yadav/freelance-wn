const express = require('express');
const router = express.Router();
const AdminPlatformController = require('../controllers/adminPlatformController');
const { verifyAdminToken } = require('../middleware/apiAuth');

// Public Auth routes
router.post('/login', AdminPlatformController.login);

// Platform CRUD routes
router.get('/list', verifyAdminToken, AdminPlatformController.list);
router.get('/info', verifyAdminToken, AdminPlatformController.info);
router.post('/add', verifyAdminToken, AdminPlatformController.add);
router.post('/edit', verifyAdminToken, AdminPlatformController.edit);
router.post('/dele', verifyAdminToken, AdminPlatformController.dele);
router.post('/disable', verifyAdminToken, AdminPlatformController.disable);

// Currency mappings
router.get('/currency/list', verifyAdminToken, AdminPlatformController.currencyList);
router.post('/currency/add', verifyAdminToken, AdminPlatformController.currencyAdd);
router.post('/currency/edit', verifyAdminToken, AdminPlatformController.currencyEdit);
router.post('/currency/dele', verifyAdminToken, AdminPlatformController.currencyDele);

// Team Authorization mappings
router.get('/auth/list', verifyAdminToken, AdminPlatformController.authList);
router.post('/auth/add', verifyAdminToken, AdminPlatformController.authAdd);
router.post('/auth/edit', verifyAdminToken, AdminPlatformController.authEdit);
router.post('/auth/dele', verifyAdminToken, AdminPlatformController.authDele);

// Project/Survey listings
router.get('/project/list', verifyAdminToken, AdminPlatformController.projectList);
router.post('/project/toggle', verifyAdminToken, AdminPlatformController.projectToggle);
router.post('/project/add', verifyAdminToken, AdminPlatformController.projectAdd);
router.post('/project/edit', verifyAdminToken, AdminPlatformController.projectEdit);
router.post('/project/delete', verifyAdminToken, AdminPlatformController.projectDelete);

// Teams directory
router.get('/team/list', verifyAdminToken, AdminPlatformController.teamList);
router.post('/team/create', verifyAdminToken, AdminPlatformController.teamCreate);
router.post('/team/update', verifyAdminToken, AdminPlatformController.teamUpdate);
router.post('/team/delete', verifyAdminToken, AdminPlatformController.teamDelete);

// Security & Analytics
router.get('/dashboard-stats', verifyAdminToken, AdminPlatformController.dashboardStats);
router.post('/member/ban', verifyAdminToken, AdminPlatformController.banMember);
router.post('/reward/clear-mark', verifyAdminToken, AdminPlatformController.clearRewardMark);
router.get('/reward/list', verifyAdminToken, AdminPlatformController.rewardList);
router.post('/reward/update-status', verifyAdminToken, AdminPlatformController.rewardUpdateStatus);
router.post('/reward/bulk-update-status', verifyAdminToken, AdminPlatformController.rewardBulkUpdateStatus);

// Extra actions
router.get('/statistic', verifyAdminToken, AdminPlatformController.platformStatistic);
router.post('/pull', verifyAdminToken, AdminPlatformController.manualPull);

// Member Management
router.get('/member/list', verifyAdminToken, AdminPlatformController.memberList);
router.post('/member/add', verifyAdminToken, AdminPlatformController.memberAdd);
router.post('/member/edit', verifyAdminToken, AdminPlatformController.memberEdit);
router.post('/member/toggle', verifyAdminToken, AdminPlatformController.memberToggle);
router.get('/member/performance', verifyAdminToken, AdminPlatformController.memberPerformance);

// File Export management
router.get('/export/list', verifyAdminToken, AdminPlatformController.exportList);
router.get('/export/info', verifyAdminToken, AdminPlatformController.exportInfo);
router.post('/export/generate', verifyAdminToken, AdminPlatformController.exportGenerate);
router.post('/export/edit', verifyAdminToken, AdminPlatformController.exportEdit);
router.post('/export/dele', verifyAdminToken, AdminPlatformController.exportDele);
router.get('/export/recycleList', verifyAdminToken, AdminPlatformController.exportRecycleList);
router.post('/export/recycleReco', verifyAdminToken, AdminPlatformController.exportRecycleReco);
router.post('/export/recycleDele', verifyAdminToken, AdminPlatformController.exportRecycleDele);

module.exports = router;
