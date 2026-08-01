const express = require('express');
const router = express.Router();
const AdminPlatformController = require('../controllers/adminPlatformController');
const PersonaController = require('../controllers/personaController');
const PersonaDataController = require('../controllers/personaDataController');
const AdminLogController = require('../controllers/adminLogController');
const TagController = require('../controllers/tagController');
const AdminImportController = require('../controllers/adminImportController');
const { verifyAdminToken } = require('../middleware/apiAuth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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
router.get('/project/recycleList', verifyAdminToken, AdminPlatformController.projectRecycleList);
router.post('/project/recycleReco', verifyAdminToken, AdminPlatformController.projectRecycleReco);
router.post('/project/recycleDele', verifyAdminToken, AdminPlatformController.projectRecycleDele);

// Teams directory
router.get('/team/list', verifyAdminToken, AdminPlatformController.teamList);
router.post('/team/create', verifyAdminToken, AdminPlatformController.teamCreate);
router.post('/team/update', verifyAdminToken, AdminPlatformController.teamUpdate);
router.post('/team/delete', verifyAdminToken, AdminPlatformController.teamDelete);

// Security & Analytics
router.get('/dashboard-stats', verifyAdminToken, AdminPlatformController.dashboardStats);
router.get('/dashboard-chart', verifyAdminToken, AdminPlatformController.dashboardChart);
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

// Data Import management
router.get('/import/template', verifyAdminToken, AdminImportController.downloadTemplate);
router.post('/import/rewards', verifyAdminToken, upload.single('import_file'), AdminImportController.importRewards);
router.post('/import/members', verifyAdminToken, upload.single('import_file'), AdminImportController.importMembers);

// Persona templates CRUD routes
router.get('/persona/list', verifyAdminToken, PersonaController.list);
router.get('/persona/info', verifyAdminToken, PersonaController.info);
router.post('/persona/add', verifyAdminToken, PersonaController.add);
router.post('/persona/edit', verifyAdminToken, PersonaController.edit);
router.post('/persona/dele', verifyAdminToken, PersonaController.dele);
router.post('/persona/copy', verifyAdminToken, PersonaController.copy);

// Persona Question Data CRUD routes
router.get('/persona-data/list', verifyAdminToken, PersonaDataController.list);
router.get('/persona-data/info', verifyAdminToken, PersonaDataController.info);
router.post('/persona-data/add', verifyAdminToken, PersonaDataController.add);
router.post('/persona-data/edit', verifyAdminToken, PersonaDataController.edit);
router.post('/persona-data/dele', verifyAdminToken, PersonaDataController.dele);

// Tag Management routes
router.get('/tag/list', verifyAdminToken, TagController.list);
router.post('/tag/add', verifyAdminToken, TagController.add);
router.post('/tag/edit', verifyAdminToken, TagController.edit);
router.post('/tag/dele', verifyAdminToken, TagController.dele);

// Admin Log routes
router.get('/admin-log/list', verifyAdminToken, AdminLogController.list);

module.exports = router;
