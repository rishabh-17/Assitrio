const Note = require('../models/Note');

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id, deleted: false }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDeletedNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id, deleted: true }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const note = new Note({
      ...req.body,
      userId: req.user.id,
      id: req.body.id || Date.now()
    });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { userId: req.user.id, id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { userId: req.user.id, id: req.params.id },
      { $set: { deleted: true } },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note moved to trash', note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.permanentlyDeleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ userId: req.user.id, id: req.params.id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { userId: req.user.id, id: req.params.id },
      { $set: { deleted: false } },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json({ message: 'Note restored', note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
