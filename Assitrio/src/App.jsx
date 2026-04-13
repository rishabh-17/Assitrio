import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { INITIAL_NOTES, INITIAL_ACTIVITIES } from './constants/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import { ShieldCheck, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Locker from './components/Locker';
import ActivityFeed from './components/ActivityFeed';
import Profile from './components/Profile';
import BottomNav from './components/BottomNav';
import ActionMenu from './components/overlays/ActionMenu';
import ListenSimulator from './components/overlays/ListenSimulator';
import TalkSimulator from './components/overlays/TalkSimulator';
import NoteDetail from './components/overlays/NoteDetail';
import CalendarToast from './components/overlays/CalendarToast';
import Onboarding from './components/Onboarding';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import PaymentHistory from './components/overlays/PaymentHistory';
import AdminManagement from './components/AdminManagement';
import { addTranscription, deleteTranscription, bootstrapFromNotes } from './services/transcriptionStore';
import { useNotificationSync } from './utils/useNotificationSync';
import { useAppPermissions } from './hooks/useAppPermissions';
import { attemptAutoSchedule, formatMeetingForDisplay } from './services/autoScheduler';
import { isGoogleConnected, isMicrosoftConnected } from './services/calendarService';
import { noteService, activityService, teamService } from './services/apiService';

import SharedRecordingAuth from './components/SharedRecordingAuth';

// Wrapper that provides auth context
export default function App() {
  const path = window.location?.pathname || '';
  if (path.startsWith('/recording/')) {
    const shareId = path.split('/')[2];
    return <SharedRecordingAuth shareId={shareId} />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, currentUser, login, signup, googleLogin, logout } = useAuth();

  const handleAuth = (mode, username, password, displayName, accountType, teamName) => {
    if (mode === 'login') {
      return login(username, password);
    } else {
      return signup(username, password, displayName, accountType, teamName);
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleAuth} onGoogleLogin={googleLogin} />;
  }

  if (currentUser.role === 'admin') {
    return <AdminExperience currentUser={currentUser} logout={logout} />;
  }

  return <AuthenticatedApp currentUser={currentUser} logout={logout} />;
}

function AdminExperience({ currentUser, logout }) {
  const [currentTab, setCurrentTab] = useState('dashboard');

  return (
    <div className="flex justify-center bg-zinc-900 h-screen w-full font-sans text-slate-800">
      <div className="app-safe-area w-full max-w-md bg-[#111111] h-full relative flex flex-col overflow-hidden sm:border-x sm:border-slate-800 shadow-2xl">

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
          {currentTab === 'dashboard' && <SuperAdminDashboard />}
          {currentTab === 'transactions' && <PaymentHistory isAdmin={true} isOverlay={false} />}
          {currentTab === 'management' && <AdminManagement />}
          {currentTab === 'profile' && (
            <Profile
              user={currentUser}
              onLogout={logout}
              deletedNotes={[]}
              restoreNote={() => { }}
              permanentlyDeleteNote={() => { }}
              notesCount={0}
            />
          )}
        </div>

        {/* Navigation */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userRole="admin"
        />
      </div>
    </div>
  );
}

function AuthenticatedApp({ currentUser, logout }) {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useLocalStorage('assistrio-onboarding-v2', false);
  const [notes, setNotes] = useLocalStorage('assistrio-notes-v2', Array.isArray(INITIAL_NOTES) ? INITIAL_NOTES : []);
  const [teamNotes, setTeamNotes] = useLocalStorage('assistrio-team-notes-v1', []);
  const [deletedNotes, setDeletedNotes] = useLocalStorage('assistrio-deleted-notes-v2', []);
  const [activities, setActivities] = useLocalStorage('assistrio-activities-v2', Array.isArray(INITIAL_ACTIVITIES) ? INITIAL_ACTIVITIES : []);
  const [overlay, setOverlay] = useState(null);
  const [calendarToastEvents, setCalendarToastEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const ragBootstrapKeyRef = useRef('');

  const teamEnabled = !!(currentUser?.accountType === 'team' || currentUser?.memberTeamId || currentUser?.ownedTeamId);
  const allNotes = teamEnabled ? [...(teamNotes || []), ...(notes || [])] : (notes || []);

  // Sync scheduled tasks natively to Android/iOS notifications
  useNotificationSync(notes);
  // Trigger native permission models for microphone, storage, and notifications
  useAppPermissions();

  useEffect(() => {
    if (currentUser) {
      noteService.getAll().then(data => {
        if (Array.isArray(data)) setNotes(data);
      }).catch(console.error);

      if (teamEnabled) {
        noteService.getTeamAll().then(data => {
          if (Array.isArray(data)) setTeamNotes(data);
        }).catch(console.error);
        teamService.getMy().then((r) => {
          const members = Array.isArray(r?.team?.members) ? r.team.members : [];
          setTeamMembers(members);
        }).catch(() => setTeamMembers([]));
      } else {
        setTeamNotes([]);
        setTeamMembers([]);
      }

      noteService.getDeleted().then(data => {
        if (Array.isArray(data)) setDeletedNotes(data);
      }).catch(console.error);

      activityService.getAll().then(data => {
        if (Array.isArray(data)) setActivities(data);
      }).catch(console.error);
    }
  }, [currentUser, teamEnabled]);

  useEffect(() => {
    const userKey = currentUser?.id ? String(currentUser.id) : 'anon';
    const key = `${userKey}:${allNotes?.length || 0}:${allNotes?.[0]?.id || 0}`;
    if (key === ragBootstrapKeyRef.current) return;
    ragBootstrapKeyRef.current = key;
    bootstrapFromNotes(allNotes).catch((e) => console.warn('RAG bootstrap:', e));
  }, [allNotes, currentUser?.id]);

  const toggleTask = useCallback(async (noteId, taskId, scope = 'personal') => {
    const list = scope === 'team' ? teamNotes : notes;
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    const note = list.find(n => n.id === noteId);
    if (!note) return;

    const updatedTasks = (note.tasks || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t);

    // Update local state
    setList(prev => prev.map(n => n.id === noteId ? { ...n, tasks: updatedTasks } : n));

    // Update backend
    try {
      const updated = await noteService.update(noteId, { tasks: updatedTasks });
      const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [notes, teamNotes, setNotes, setTeamNotes, setActivities]);

  const addNoteAndActivity = useCallback(async (newNote, newActivityOrActivities) => {
    setNotes(prev => [newNote, ...prev]);

    try {
      const created = await noteService.create(newNote);
      const createdActivities = Array.isArray(created?.activities) ? created.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }

      if (newActivityOrActivities) {
        if (Array.isArray(newActivityOrActivities)) {
          const items = newActivityOrActivities.filter(Boolean);
          if (items.length) {
            await activityService.createBulk(items);
            setActivities(prev => [...items, ...prev]);
          }
        } else {
          await activityService.create(newActivityOrActivities);
          setActivities(prev => [newActivityOrActivities, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to save to backend:', err);
    }
  }, [setNotes, setActivities]);

  const updateNote = useCallback(async (noteId, updates, scope = 'personal') => {
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    setList(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    try {
      const updated = await noteService.update(noteId, updates);
      const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  }, [setNotes, setTeamNotes, setActivities]);

  const deleteNote = useCallback(async (id, scope = 'personal') => {
    const list = scope === 'team' ? teamNotes : notes;
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    const noteToDelete = list.find(n => n.id === id);
    if (!noteToDelete) return;

    setList(prev => prev.filter(n => n.id !== id));
    if (scope === 'personal') setDeletedNotes(prev => [noteToDelete, ...prev]);

    try {
      const resp = await noteService.delete(id);
      const createdActivities = Array.isArray(resp?.activities) ? resp.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, [notes, teamNotes, setNotes, setTeamNotes, setDeletedNotes, setActivities]);

  const restoreNote = useCallback(async (id) => {
    const noteToRestore = deletedNotes.find(n => n.id === id);
    if (!noteToRestore) return;

    setDeletedNotes(prev => prev.filter(n => n.id !== id));
    setNotes(prev => [noteToRestore, ...prev]);

    try {
      const resp = await noteService.restore(id);
      const createdActivities = Array.isArray(resp?.activities) ? resp.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to restore note:', err);
    }
  }, [deletedNotes, setNotes, setDeletedNotes, setActivities]);

  const permanentlyDeleteNote = useCallback(async (id) => {
    setDeletedNotes(prev => prev.filter(n => n.id !== id));
    try {
      const resp = await noteService.permanentlyDelete(id);
      const createdActivities = Array.isArray(resp?.activities) ? resp.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to permanently delete note:', err);
    }
  }, [setDeletedNotes, setActivities]);

  const addTask = useCallback(async (noteId, taskInput) => {
    const text = typeof taskInput === 'string' ? taskInput : (taskInput?.text || '');
    const newTask = {
      id: Date.now(),
      text,
      done: false,
      date: typeof taskInput === 'object' ? (taskInput?.date || null) : null,
      priority: typeof taskInput === 'object' ? (taskInput?.priority || 'Normal') : 'Normal',
      assignee: typeof taskInput === 'object' ? (taskInput?.assignee || '') : '',
      assigneeUserId: typeof taskInput === 'object' ? (taskInput?.assigneeUserId || null) : null,
      createdByUserId: currentUser?.id || null
    };
    const scope = teamEnabled && teamNotes?.some(n => n.id === noteId) ? 'team' : 'personal';
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    setList(prev => prev.map(n => {
      if (n.id === noteId) {
        const updatedTasks = [...(n.tasks || []), newTask];
        noteService.update(noteId, { tasks: updatedTasks }).then((updated) => {
          const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
          if (createdActivities.length) setActivities(prev => [...createdActivities, ...prev]);
        }).catch(console.error);
        return { ...n, tasks: updatedTasks };
      }
      return n;
    }));
  }, [setNotes, setTeamNotes, setActivities, teamEnabled, teamNotes, currentUser?.id]);

  const updateTask = useCallback(async (noteId, taskId, updates, scopeHint = null) => {
    const scope = scopeHint || (teamEnabled && teamNotes?.some(n => n.id === noteId) ? 'team' : 'personal');
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    const patch = typeof updates === 'string' ? { text: updates } : (updates || {});
    setList(prev => prev.map(n => {
      if (n.id === noteId) {
        const updatedTasks = (n.tasks || []).map(t => t.id === taskId ? { ...t, ...patch } : t);
        noteService.update(noteId, { tasks: updatedTasks }).then((updated) => {
          const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
          if (createdActivities.length) setActivities(prev => [...createdActivities, ...prev]);
        }).catch(async (e) => {
          if (e?.response?.status === 403) {
            try {
              if (scope === 'team') {
                const fresh = await noteService.getTeamAll();
                if (Array.isArray(fresh)) setTeamNotes(fresh);
              } else {
                const fresh = await noteService.getAll();
                if (Array.isArray(fresh)) setNotes(fresh);
              }
            } catch (err) { }
          }
        });
        return { ...n, tasks: updatedTasks };
      }
      return n;
    }));
  }, [setNotes, setTeamNotes, setActivities, teamEnabled, teamNotes]);

  const deleteTask = useCallback(async (noteId, taskId, scopeHint = null) => {
    const scope = scopeHint || (teamEnabled && teamNotes?.some(n => n.id === noteId) ? 'team' : 'personal');
    const setList = scope === 'team' ? setTeamNotes : setNotes;
    setList(prev => prev.map(n => {
      if (n.id === noteId) {
        const updatedTasks = (n.tasks || []).filter(t => t.id !== taskId);
        noteService.update(noteId, { tasks: updatedTasks }).then((updated) => {
          const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
          if (createdActivities.length) setActivities(prev => [...createdActivities, ...prev]);
        }).catch(async (e) => {
          if (e?.response?.status === 403) {
            try {
              if (scope === 'team') {
                const fresh = await noteService.getTeamAll();
                if (Array.isArray(fresh)) setTeamNotes(fresh);
              } else {
                const fresh = await noteService.getAll();
                if (Array.isArray(fresh)) setNotes(fresh);
              }
            } catch (err) { }
          }
        });
        return { ...n, tasks: updatedTasks };
      }
      return n;
    }));
  }, [setNotes, setTeamNotes, setActivities, teamEnabled, teamNotes]);

  const scheduleFromNote = useCallback(async (noteId) => {
    const resolvedId = typeof noteId === 'object' && noteId?.id ? noteId.id : noteId;
    const rawTranscript = typeof noteId === 'object' && noteId?.transcript ? noteId.transcript : undefined;
    const note = typeof noteId === 'object'
      ? noteId
      : (notes.find(n => n.id === resolvedId) || teamNotes.find(n => n.id === resolvedId));
    if (!note) return;

    try {
      const result = await attemptAutoSchedule(note, rawTranscript, teamMembers);
      if (result?.scheduled) {
        const toastEvents = result.events.map((ev) => {
          const { displayDate, displayTime } = formatMeetingForDisplay(ev);
          const providers = result.results.filter(r => r.success).map(r => r.provider);
          return { title: ev.title, displayDate, displayTime, providers };
        });
        setCalendarToastEvents(toastEvents);

        const calActivities = result.events.map((ev, i) => {
          const { displayDate, displayTime } = formatMeetingForDisplay(ev);
          return {
            id: Date.now() + 5000 + i,
            time: 'Just Now',
            title: `Meeting Scheduled: ${ev.title}`,
            sub: `${displayDate} at ${displayTime}`,
            icon: 'calendar',
          };
        });
        setActivities(prev => [...calActivities, ...prev]);
        activityService.createBulk(calActivities).catch(console.error);
      }
    } catch (err) {
      console.warn('Auto-schedule failed:', err);
    }
  }, [notes, setActivities]);

  const currentNote = overlay?.type === 'note'
    ? (overlay.scope === 'team'
      ? teamNotes.find(n => n.id === overlay.id) || notes.find(n => n.id === overlay.id)
      : notes.find(n => n.id === overlay.id) || teamNotes.find(n => n.id === overlay.id))
    : null;

  return (
    <div className="flex justify-center bg-zinc-900 h-screen w-full font-sans text-slate-800">
      <div className="app-safe-area w-full max-w-md bg-[#111111] h-full relative flex flex-col overflow-hidden sm:border-x sm:border-zinc-800 shadow-2xl">

        {!hasSeenOnboarding ? (
          <Onboarding onComplete={() => setHasSeenOnboarding(true)} />
        ) : (
          <>
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
              {currentTab === 'dashboard' && (
                <Dashboard
                  pendingTasks={allNotes.flatMap(n => (n.tasks || []).filter(t => !t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title })))}
                  notes={notes}
                  deletedNotes={deletedNotes}
                  toggleTask={(noteId, taskId) => toggleTask(noteId, taskId, teamEnabled && teamNotes?.some(n => n.id === noteId) ? 'team' : 'personal')}
                  deleteTask={deleteTask}
                  openNote={(id, tab = 'summary') => setOverlay({ type: 'note', id, tab, scope: teamEnabled && teamNotes?.some(n => n.id === id) ? 'team' : 'personal' })}
                  goToLocker={() => setCurrentTab('locker')}
                />
              )}
              {currentTab === 'locker' && (
                <Locker
                  notes={notes}
                  teamNotes={teamNotes}
                  teamEnabled={teamEnabled}
                  teamMembers={teamMembers}
                  currentUserId={String(currentUser?.id || '')}
                  currentUserEmail={String(currentUser?.email || '')}
                  currentUserUsername={String(currentUser?.username || '')}
                  pendingTasks={allNotes.flatMap(n => (n.tasks || []).filter(t => !t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title, scope: teamEnabled && teamNotes?.some(tn => tn.id === n.id) ? 'team' : 'personal' })))}
                  completedTasks={allNotes.flatMap(n => (n.tasks || []).filter(t => t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title, scope: teamEnabled && teamNotes?.some(tn => tn.id === n.id) ? 'team' : 'personal' })))}
                  toggleTask={(noteId, taskId) => toggleTask(noteId, taskId, teamEnabled && teamNotes?.some(n => n.id === noteId) ? 'team' : 'personal')}
                  openNote={(id, tab = 'summary', scope = null) => {
                    const resolvedScope = scope || (teamEnabled && teamNotes?.some(n => n.id === id) ? 'team' : 'personal');
                    setOverlay({ type: 'note', id, tab, scope: resolvedScope });
                  }}
                  deleteNote={deleteNote}
                  deleteTask={deleteTask}
                  updateTask={updateTask}
                />
              )}
              {currentTab === 'activity' && <ActivityFeed activities={activities} notes={notes} />}
              {currentTab === 'profile' && (
                <Profile
                  user={currentUser}
                  onLogout={logout}
                  deletedNotes={deletedNotes}
                  restoreNote={restoreNote}
                  permanentlyDeleteNote={permanentlyDeleteNote}
                  notesCount={notes.length}
                />
              )}
            </div>

            {/* Overlays */}
            {overlay?.type === 'menu' && (
              <ActionMenu
                onClose={() => setOverlay(null)}
                onSelect={(type) => setOverlay({ type })}
              />
            )}
            {overlay?.type === 'listen' && (
              <ListenSimulator
                onClose={() => setOverlay(null)}
                onSaveDraft={(note) => {
                  addNoteAndActivity(note, null);
                  setOverlay(null);
                }}
                updateNote={updateNote}
                appendActivities={(items) => {
                  if (!items?.length) return;
                  setActivities((prev) => [...items, ...prev]);
                  activityService.createBulk(items).catch(console.error);
                }}
                scheduleFromNote={scheduleFromNote}
                teamMembers={teamMembers}
                currentUserId={String(currentUser?.id || '')}
              />
            )}
            {overlay?.type === 'talk' && (
              <TalkSimulator
                onClose={() => setOverlay(null)}
                notes={notes}
                teamMembers={teamMembers}
                currentUserId={String(currentUser?.id || '')}
                onSaveMOM={(note, activity) => {
                  addNoteAndActivity(note, activity);
                  setOverlay({ type: 'note', id: note.id });
                }}
                updateNote={updateNote}
                addTask={addTask}
                appendActivities={(items) => {
                  if (!items?.length) return;
                  setActivities((prev) => [...items, ...prev]);
                  activityService.createBulk(items).catch(console.error);
                }}
                scheduleFromNote={scheduleFromNote}
              />
            )}
            {overlay?.type === 'note' && currentNote && (
              <NoteDetail
                note={currentNote}
                initialTab={overlay.tab}
                onClose={() => setOverlay(null)}
                toggleTask={(noteId, taskId) => toggleTask(noteId, taskId, overlay.scope || 'personal')}
                deleteNote={(noteId) => deleteNote(noteId, overlay.scope || 'personal')}
                updateNote={(noteId, updates) => updateNote(noteId, updates, overlay.scope || 'personal')}
                addTask={(noteId, text) => addTask(noteId, text)}
                deleteTask={(noteId, taskId) => deleteTask(noteId, taskId)}
                updateTask={(noteId, taskId, u) => updateTask(noteId, taskId, u, overlay.scope || null)}
                teamMembers={teamMembers}
                scheduleFromNote={scheduleFromNote}
              />
            )}

            {calendarToastEvents.length > 0 && (
              <CalendarToast
                events={calendarToastEvents}
                onClose={() => setCalendarToastEvents([])}
              />
            )}

            <BottomNav
              currentTab={currentTab}
              onTabChange={(tab) => { setOverlay(null); setCurrentTab(tab); }}
              onActionClick={() => setOverlay({ type: 'menu' })}
            />
          </>
        )}
      </div>
    </div>
  );
}
