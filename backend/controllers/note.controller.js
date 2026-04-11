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

exports.verifySharedNote = async (req, res) => {
  try {
    const { shareId, accessCode } = req.body;
    if (!shareId || !accessCode) {
      return res.status(400).json({ error: 'Missing shareId or accessCode' });
    }

    const notes = await Note.find({
      deleted: false,
      $expr: {
        $eq: [
          { $substr: [{ $toString: "$id" }, 0, shareId.length] },
          shareId
        ]
      }
    }).limit(5);

    if (!notes || notes.length === 0) {
      return res.status(404).json({ error: 'Recording not found or expired.' });
    }

    let matchedNote = null;
    for (const n of notes) {
      const noteIdStr = String(n.id);
      let hash = 0;
      for (let i = 0; i < noteIdStr.length; i++) {
        hash = ((hash << 5) - hash) + noteIdStr.charCodeAt(i);
        hash |= 0;
      }
      const correctCode = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
      if (accessCode === correctCode) {
        matchedNote = n;
        break;
      }
    }

    if (!matchedNote) {
      return res.status(403).json({ error: 'Invalid Access Code.' });
    }

    const noteObj = matchedNote.toObject();
    delete noteObj.userId;
    delete noteObj.__v;

    res.json(noteObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
