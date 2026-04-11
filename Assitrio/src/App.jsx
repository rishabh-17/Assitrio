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
import { noteService, activityService } from './services/apiService';

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

  const handleAuth = (mode, username, password, displayName) => {
    if (mode === 'login') {
      return login(username, password);
    } else {
      return signup(username, password, displayName);
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
      <div className="w-full max-w-md bg-[#111111] h-full relative flex flex-col overflow-hidden sm:border-x sm:border-slate-800 shadow-2xl">

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
  const [deletedNotes, setDeletedNotes] = useLocalStorage('assistrio-deleted-notes-v2', []);
  const [activities, setActivities] = useLocalStorage('assistrio-activities-v2', Array.isArray(INITIAL_ACTIVITIES) ? INITIAL_ACTIVITIES : []);
  const [overlay, setOverlay] = useState(null);
  const [calendarToastEvents, setCalendarToastEvents] = useState([]);
  const bootstrapDone = useRef(false);

  // Sync scheduled tasks natively to Android/iOS notifications
  useNotificationSync(notes);
  // Trigger native permission models for microphone, storage, and notifications
  useAppPermissions();

  useEffect(() => {
    if (currentUser) {
      noteService.getAll().then(data => {
        if (Array.isArray(data)) setNotes(data);
      }).catch(console.error);

      noteService.getDeleted().then(data => {
        if (Array.isArray(data)) setDeletedNotes(data);
      }).catch(console.error);

      activityService.getAll().then(data => {
        if (Array.isArray(data)) setActivities(data);
      }).catch(console.error);
    }
  }, [currentUser]);

  // Bootstrap RAG index from existing notes on first mount
  useEffect(() => {
    if (bootstrapDone.current) return;
    bootstrapDone.current = true;
    bootstrapFromNotes(notes).catch((e) => console.warn('RAG bootstrap:', e));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTask = useCallback(async (noteId, taskId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedTasks = (note.tasks || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t);

    // Update local state
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, tasks: updatedTasks } : n));

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
  }, [notes, setNotes, setActivities]);

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

  const updateNote = useCallback(async (noteId, updates) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    try {
      const updated = await noteService.update(noteId, updates);
      const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  }, [setNotes, setActivities]);

  const deleteNote = useCallback(async (id) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    setNotes(prev => prev.filter(n => n.id !== id));
    setDeletedNotes(prev => [noteToDelete, ...prev]);

    try {
      const resp = await noteService.delete(id);
      const createdActivities = Array.isArray(resp?.activities) ? resp.activities : [];
      if (createdActivities.length) {
        setActivities(prev => [...createdActivities, ...prev]);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, [notes, setNotes, setDeletedNotes, setActivities]);

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

  const addTask = useCallback(async (noteId, taskText) => {
    const newTask = { id: Date.now(), text: taskText, done: false };
    setNotes(prev => prev.map(n => {
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
  }, [setNotes, setActivities]);

  const updateTask = useCallback(async (noteId, taskId, newText) => {
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const updatedTasks = (n.tasks || []).map(t => t.id === taskId ? { ...t, text: newText } : t);
        noteService.update(noteId, { tasks: updatedTasks }).then((updated) => {
          const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
          if (createdActivities.length) setActivities(prev => [...createdActivities, ...prev]);
        }).catch(console.error);
        return { ...n, tasks: updatedTasks };
      }
      return n;
    }));
  }, [setNotes, setActivities]);

  const deleteTask = useCallback(async (noteId, taskId) => {
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const updatedTasks = (n.tasks || []).filter(t => t.id !== taskId);
        noteService.update(noteId, { tasks: updatedTasks }).then((updated) => {
          const createdActivities = Array.isArray(updated?.activities) ? updated.activities : [];
          if (createdActivities.length) setActivities(prev => [...createdActivities, ...prev]);
        }).catch(console.error);
        return { ...n, tasks: updatedTasks };
      }
      return n;
    }));
  }, [setNotes, setActivities]);

  const scheduleFromNote = useCallback(async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    try {
      const result = await attemptAutoSchedule(note);
      if (result?.success) {
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

  const currentNote = overlay?.type === 'note' ? notes.find(n => n.id === overlay.id) : null;

  return (
    <div className="flex justify-center bg-zinc-900 h-screen w-full font-sans text-slate-800">
      <div className="w-full max-w-md bg-[#111111] h-full relative flex flex-col overflow-hidden sm:border-x sm:border-zinc-800 shadow-2xl">

        {!hasSeenOnboarding ? (
          <Onboarding onComplete={() => setHasSeenOnboarding(true)} />
        ) : (
          <>
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
              {currentTab === 'dashboard' && (
                <Dashboard
                  pendingTasks={notes.flatMap(n => (n.tasks || []).filter(t => !t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title })))}
                  notes={notes}
                  deletedNotes={deletedNotes}
                  toggleTask={toggleTask}
                  deleteTask={deleteTask}
                  openNote={(id, tab = 'summary') => setOverlay({ type: 'note', id, tab })}
                  goToLocker={() => setCurrentTab('locker')}
                />
              )}
              {currentTab === 'locker' && (
                <Locker
                  notes={notes}
                  pendingTasks={notes.flatMap(n => (n.tasks || []).filter(t => !t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title })))}
                  completedTasks={notes.flatMap(n => (n.tasks || []).filter(t => t.done).map(t => ({ ...t, noteId: n.id, noteTitle: n.title })))}
                  toggleTask={toggleTask}
                  openNote={(id, tab = 'summary') => setOverlay({ type: 'note', id, tab })}
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
              />
            )}
            {overlay?.type === 'talk' && (
              <TalkSimulator
                onClose={() => setOverlay(null)}
                notes={notes}
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
                toggleTask={toggleTask}
                deleteNote={deleteNote}
                updateNote={updateNote}
                addTask={addTask}
                deleteTask={deleteTask}
                updateTask={updateTask}
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
