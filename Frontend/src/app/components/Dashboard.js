'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import NotesList from './NotesList';
import CreateNoteModal from './CreateNoteModal';
import EditNoteModal from './EditNoteModal';
import UpgradePrompt from './UpgradePrompt';
import { notesAPI } from '../utils/api';
import { Plus, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteStats, setNoteStats] = useState(null);

  useEffect(() => {
    fetchNotes();
    fetchNoteStats();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await notesAPI.list();
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchNoteStats = async () => {
    try {
      const response = await notesAPI.getStats();
      setNoteStats(response.data);
    } catch (error) {
      console.error('Error fetching note stats:', error);
    }
  };

  const handleCreateNote = async (noteData) => {
    try {
      await notesAPI.create(noteData);
      await fetchNotes();
      await fetchNoteStats();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating note:', error);
      if (error.response?.status === 403) {
        // Note limit reached
        await fetchNoteStats();
      }
      throw error;
    }
  };

  const handleUpdateNote = async (id, noteData) => {
    try {
      await notesAPI.update(id, noteData);
      await fetchNotes();
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      await notesAPI.delete(id);
      await fetchNotes();
      await fetchNoteStats();
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Failed to delete note');
    }
  };

  const canCreateNote = noteStats?.canCreate !== false;
  const shouldShowUpgrade = noteStats && !noteStats.unlimited && noteStats.remaining <= 1;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onUpgradeSuccess={() => fetchNoteStats()} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email}
          </h1>
          <p className="mt-2 text-gray-600">
            {user?.tenant?.name} • {user?.role} • {user?.tenant?.plan?.toUpperCase()} Plan
          </p>
        </div>

        {/* Stats and Upgrade Prompt */}
        {noteStats && (
          <div className="mb-6 space-y-4">
            {/* Note Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Your Notes</h3>
                  <p className="text-sm text-gray-600">
                    {noteStats.unlimited 
                      ? `${noteStats.current} notes (Unlimited)`
                      : `${noteStats.current} of ${noteStats.limit} notes used`
                    }
                  </p>
                </div>
                {!noteStats.unlimited && (
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      noteStats.remaining === 0 ? 'text-red-600' : 
                      noteStats.remaining === 1 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {noteStats.remaining}
                    </div>
                    <div className="text-sm text-gray-500">remaining</div>
                  </div>
                )}
              </div>
            </div>

            {/* Upgrade Prompt */}
            {shouldShowUpgrade && <UpgradePrompt noteStats={noteStats} />}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!canCreateNote}
                className={`${canCreateNote ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'} flex items-center`}
                title={!canCreateNote ? 'Note limit reached. Upgrade to Pro for unlimited notes.' : 'Create new note'}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Note
              </button>
            </div>
            {!canCreateNote && (
              <p className="mt-2 text-sm text-red-600">
                Note limit reached. Upgrade to Pro for unlimited notes.
              </p>
            )}
          </div>

          <div className="p-6">
            <NotesList
              notes={notes}
              loading={loading}
              onEdit={setEditingNote}
              onDelete={handleDeleteNote}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateNoteModal
          onSubmit={handleCreateNote}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingNote && (
        <EditNoteModal
          note={editingNote}
          onSubmit={(data) => handleUpdateNote(editingNote.id, data)}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;