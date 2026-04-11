const Note = require('../models/Note');
const Activity = require('../models/Activity');

function safeToNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function timeLabelNow() {
  try {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Just Now';
  }
}

async function logActivity(req, payload) {
  try {
    const data = payload || {};
    const activity = new Activity({
      userId: req.user.id,
      id: data.id || Date.now(),
      time: data.time || timeLabelNow(),
      title: data.title,
      sub: data.sub,
      icon: data.icon || 'note',
      type: data.type,
      noteId: safeToNumber(data.noteId),
      metadata: data.metadata
    });
    await activity.save();
    return activity;
  } catch (e) {
    return null;
  }
}

function getTaskMap(tasks) {
  const map = new Map();
  if (!Array.isArray(tasks)) return map;
  for (const t of tasks) {
    const id = t?.id;
    if (id === undefined || id === null) continue;
    map.set(String(id), t);
  }
  return map;
}

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
    const source = typeof note.source === 'string' ? note.source : 'note';
    const isRecording = source === 'listen' || source === 'talk';
    const title = isRecording ? 'Meeting captured' : 'Note created';
    const sub = note.title ? String(note.title) : undefined;
    const activity = await logActivity(req, {
      title,
      sub,
      icon: isRecording ? 'mic' : 'note',
      type: isRecording ? 'recording' : 'note',
      noteId: note.id,
      metadata: { source, duration: note.duration }
    });
    res.status(201).json({ note, activities: activity ? [activity] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const before = await Note.findOne({ userId: req.user.id, id: noteId });
    const note = await Note.findOneAndUpdate(
      { userId: req.user.id, id: noteId },
      { $set: req.body },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const createdActivities = [];
    const payload = req.body || {};
    const updatedTranscript = typeof payload.transcript === 'string' ? payload.transcript : null;
    const updatedCallStatus = typeof payload.callStatus === 'string' ? payload.callStatus : null;
    const updatedTasks = Array.isArray(payload.tasks) ? payload.tasks : null;

    if (before) {
      const source = typeof note.source === 'string' ? note.source : 'note';
      const isRecording = source === 'listen' || source === 'talk';

      if (updatedTranscript && updatedTranscript !== before.transcript) {
        const wasPlaceholder = typeof before.transcript === 'string' && /transcrib/i.test(before.transcript);
        const isReal = updatedTranscript.trim().length > 20 && !/transcrib/i.test(updatedTranscript);
        if (isRecording && (wasPlaceholder || isReal)) {
          const a = await logActivity(req, {
            title: 'Transcription completed',
            sub: note.title ? String(note.title) : undefined,
            icon: 'shield',
            type: 'ai',
            noteId: note.id,
            metadata: { source }
          });
          if (a) createdActivities.push(a);
        }
      }

      if (updatedCallStatus && updatedCallStatus !== before.callStatus) {
        if (updatedCallStatus === 'completed') {
          const a = await logActivity(req, {
            title: 'MOM generated',
            sub: note.title ? String(note.title) : undefined,
            icon: 'shield',
            type: 'ai',
            noteId: note.id,
            metadata: { source }
          });
          if (a) createdActivities.push(a);
        }
      }

      if (updatedTasks) {
        const prev = getTaskMap(before.tasks);
        const next = getTaskMap(updatedTasks);

        for (const [id, t] of next.entries()) {
          if (!prev.has(id)) {
            const text = t?.text ? String(t.text) : 'New task';
            const a = await logActivity(req, {
              title: `Task added: ${text}`,
              sub: note.title ? String(note.title) : undefined,
              icon: 'task',
              type: 'task',
              noteId: note.id,
              metadata: { taskId: id }
            });
            if (a) createdActivities.push(a);
          }
        }

        for (const [id, tPrev] of prev.entries()) {
          const tNext = next.get(id);
          if (!tNext) {
            const text = tPrev?.text ? String(tPrev.text) : 'Task removed';
            const a = await logActivity(req, {
              title: `Task removed: ${text}`,
              sub: note.title ? String(note.title) : undefined,
              icon: 'archive',
              type: 'task',
              noteId: note.id,
              metadata: { taskId: id }
            });
            if (a) createdActivities.push(a);
            continue;
          }
          const prevDone = !!tPrev?.done;
          const nextDone = !!tNext?.done;
          if (prevDone !== nextDone) {
            const text = tNext?.text ? String(tNext.text) : 'Task updated';
            const a = await logActivity(req, {
              title: nextDone ? `Task completed: ${text}` : `Task reopened: ${text}`,
              sub: note.title ? String(note.title) : undefined,
              icon: 'task',
              type: 'task',
              noteId: note.id,
              metadata: { taskId: id, done: nextDone }
            });
            if (a) createdActivities.push(a);
          }
        }
      }
    }

    res.json({ note, activities: createdActivities });
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
    const activity = await logActivity(req, {
      title: 'Note deleted',
      sub: note.title ? String(note.title) : undefined,
      icon: 'archive',
      type: 'delete',
      noteId: note.id
    });
    res.json({ message: 'Note moved to trash', note, activities: activity ? [activity] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.permanentlyDeleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ userId: req.user.id, id: req.params.id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const activity = await logActivity(req, {
      title: 'Note permanently deleted',
      sub: note.title ? String(note.title) : undefined,
      icon: 'archive',
      type: 'delete',
      noteId: note.id
    });
    res.json({ message: 'Note permanently deleted', activities: activity ? [activity] : [] });
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
    const activity = await logActivity(req, {
      title: 'Note restored',
      sub: note.title ? String(note.title) : undefined,
      icon: 'shield',
      type: 'restore',
      noteId: note.id
    });
    res.json({ message: 'Note restored', note, activities: activity ? [activity] : [] });
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
