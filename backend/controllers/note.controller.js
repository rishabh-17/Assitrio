const Note = require('../models/Note');
const Activity = require('../models/Activity');
const User = require('../models/User');
const Team = require('../models/Team');

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

async function getUserTeamId(req) {
  const fromToken = req.user?.memberTeamId || req.user?.ownedTeamId || null;
  if (fromToken) return fromToken;
  try {
    const u = await User.findById(req.user.id).select('memberTeamId ownedTeamId');
    return u?.memberTeamId || u?.ownedTeamId || null;
  } catch (e) {
    return null;
  }
}

async function accessibleNoteQuery(req, noteId) {
  const teamId = await getUserTeamId(req);
  const or = [{ userId: req.user.id }];
  if (teamId) or.push({ teamId });
  return { id: noteId, $or: or };
}

function normalizeObjectIdString(v) {
  if (!v) return null;
  try {
    return String(v);
  } catch (e) {
    return null;
  }
}

function taskCreatorIdForExisting(noteDoc, task) {
  const t = task || {};
  const explicit = normalizeObjectIdString(t.createdByUserId);
  if (explicit) return explicit;
  const noteCreator = normalizeObjectIdString(noteDoc?.createdByUserId);
  if (noteCreator) return noteCreator;
  return normalizeObjectIdString(noteDoc?.userId);
}

async function sanitizeAndValidateTasks(req, noteBefore, proposedTasks) {
  if (!Array.isArray(proposedTasks)) return null;

  const prevMap = getTaskMap(noteBefore?.tasks || []);
  const next = [];

  const removedTaskIds = [];
  for (const [id] of prevMap.entries()) {
    const stillExists = proposedTasks.some((t) => String(t?.id) === id);
    if (!stillExists) removedTaskIds.push(id);
  }

  if (noteBefore?.teamId && removedTaskIds.length > 0) {
    const requesterId = String(req.user.id);
    for (const taskId of removedTaskIds) {
      const prevTask = prevMap.get(taskId);
      const creatorId = taskCreatorIdForExisting(noteBefore, prevTask);
      if (creatorId && creatorId !== requesterId) {
        const err = new Error('Only the task creator can delete this task');
        err.status = 403;
        throw err;
      }
    }
  }

  let teamMemberIdSet = null;
  const hasAssigneeUserId = proposedTasks.some((t) => t?.assigneeUserId);
  if (noteBefore?.teamId && hasAssigneeUserId) {
    const team = await Team.findById(noteBefore.teamId).select('ownerId members.userId');
    if (!team) {
      const err = new Error('Team not found');
      err.status = 404;
      throw err;
    }
    teamMemberIdSet = new Set();
    teamMemberIdSet.add(String(team.ownerId));
    for (const m of (team.members || [])) {
      if (m?.userId) teamMemberIdSet.add(String(m.userId));
    }
  }

  for (const raw of proposedTasks) {
    if (!raw || raw.id === undefined || raw.id === null) continue;
    const idStr = String(raw.id);
    const prevTask = prevMap.get(idStr);
    const createdByUserId = prevTask?.createdByUserId || taskCreatorIdForExisting(noteBefore, prevTask) || req.user.id;

    const assigneeUserIdRaw = raw.assigneeUserId || null;
    const assigneeUserId = assigneeUserIdRaw ? normalizeObjectIdString(assigneeUserIdRaw) : null;
    if (noteBefore?.teamId && assigneeUserId && teamMemberIdSet && !teamMemberIdSet.has(assigneeUserId)) {
      const err = new Error('Assignee must be a team member');
      err.status = 400;
      throw err;
    }

    next.push({
      ...raw,
      createdByUserId,
      assigneeUserId: assigneeUserIdRaw ? assigneeUserIdRaw : null,
    });
  }

  return next;
}

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.user.id,
      deleted: false,
      $or: [{ teamId: { $exists: false } }, { teamId: null }]
    }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDeletedNotes = async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.user.id,
      deleted: true,
      $or: [{ teamId: { $exists: false } }, { teamId: null }]
    }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTeamNotes = async (req, res) => {
  try {
    const teamId = await getUserTeamId(req);
    if (!teamId) return res.json([]);
    const notes = await Note.find({ teamId, deleted: false }).sort({ createdAt: -1 });
    const normalized = notes.map((n) => {
      const tasks = Array.isArray(n.tasks) ? n.tasks.map((t) => ({
        ...t.toObject?.() || t,
        createdByUserId: t?.createdByUserId || n.createdByUserId || n.userId || null
      })) : [];
      const obj = n.toObject();
      obj.tasks = tasks;
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNote = async (req, res) => {
  try {
    const teamId = await getUserTeamId(req);
    const isTeamAccount = req.user?.accountType === 'team';
    const body = { ...(req.body || {}) };
    delete body.teamId;
    delete body.createdByUserId;
    if (Array.isArray(body.tasks)) {
      body.tasks = body.tasks.map((t) => ({
        ...t,
        createdByUserId: t?.createdByUserId || req.user.id
      }));
    }

    const note = new Note({
      ...body,
      userId: req.user.id,
      createdByUserId: req.user.id,
      teamId: isTeamAccount ? teamId : undefined,
      assigneeUserId: body.assigneeUserId || null,
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
      metadata: { source, duration: note.duration, teamId: note.teamId ? String(note.teamId) : null }
    });
    res.status(201).json({ note, activities: activity ? [activity] : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const noteId = req.params.id;
    const query = await accessibleNoteQuery(req, noteId);
    const before = await Note.findOne(query);
    if (!before) return res.status(404).json({ error: 'Note not found' });

    const payload = req.body || {};
    const updates = { ...payload };

    if (updates.assigneeUserId && before.teamId) {
      const team = await Team.findById(before.teamId).select('ownerId members.userId');
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      const teamMemberIdSet = new Set();
      teamMemberIdSet.add(String(team.ownerId));
      for (const m of (team.members || [])) {
        if (m?.userId) teamMemberIdSet.add(String(m.userId));
      }
      if (!teamMemberIdSet.has(String(updates.assigneeUserId))) {
        return res.status(400).json({ error: 'Assignee must be a team member' });
      }
    }

    if (Array.isArray(payload.tasks)) {
      updates.tasks = await sanitizeAndValidateTasks(req, before, payload.tasks);
    }

    const note = await Note.findOneAndUpdate(
      query,
      { $set: updates },
      { new: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const createdActivities = [];
    const updatedTranscript = typeof updates.transcript === 'string' ? updates.transcript : null;
    const updatedCallStatus = typeof updates.callStatus === 'string' ? updates.callStatus : null;
    const updatedTasks = Array.isArray(updates.tasks) ? updates.tasks : null;

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
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const query = await accessibleNoteQuery(req, req.params.id);
    const note = await Note.findOneAndUpdate(
      query,
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
    const query = await accessibleNoteQuery(req, req.params.id);
    const note = await Note.findOneAndDelete(query);
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
    const query = await accessibleNoteQuery(req, req.params.id);
    const note = await Note.findOneAndUpdate(
      query,
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
