const express = require('express');
const router = express.Router();
const noteController = require('../controllers/note.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', noteController.getNotes);
router.get('/deleted', noteController.getDeletedNotes);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);
router.delete('/:id/permanent', noteController.permanentlyDeleteNote);
router.post('/:id/restore', noteController.restoreNote);

module.exports = router;
