const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const teamController = require('../controllers/team.controller');

router.use(authMiddleware);

router.post('/', teamController.createTeam);
router.get('/my', teamController.getMyTeam);

router.get('/invitations', teamController.getMyInvitations);
router.post('/invitations/:inviteId/accept', teamController.acceptInvitation);
router.post('/invitations/:inviteId/reject', teamController.rejectInvitation);

router.post('/:teamId/invite', teamController.inviteToTeam);

module.exports = router;

