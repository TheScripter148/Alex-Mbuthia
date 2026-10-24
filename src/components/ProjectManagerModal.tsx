import React, { useRef, useState } from 'react';
import { FolderOpen, Save, Copy, Trash2, Edit2, Upload, Download, Check, X, Clock, FileCode } from 'lucide-react';
import { ProjectState } from '../types';
import { exportProjectFile } from '../utils/pdfExport';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ProjectState;
  onLoadProject: (project: ProjectState) => void;
  onSaveCurrentProject: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
  onSaveCurrentProject,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savedProjects, setSavedProjects] = useState<ProjectState[]>(() => {
    try {
      const raw = localStorage.getItem('alexforge_covercraft_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  if (!isOpen) return null;

  const persistProjects = (projects: ProjectState[]) => {
    setSavedProjects(projects);
    try {
      localStorage.setItem('alexforge_covercraft_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to persist projects to localStorage:', e);
    }
  };

  const handleSaveCurrent = () => {
    const existingIndex = savedProjects.findIndex((p) => p.id === currentProject.id);
    const updated = {
      ...currentProject,
      lastModified: Date.now(),
    };

    let nextProjects: ProjectState[];
    if (existingIndex >= 0) {
      nextProjects = [...savedProjects];
      nextProjects[existingIndex] = updated;
    } else {
      nextProjects = [updated, ...savedProjects];
    }
    persistProjects(nextProjects);
    onSaveCurrentProject();
  };

  const handleDuplicate = (project: ProjectState) => {
    const duplicated: ProjectState = {
      ...project,
      id: `project-${Date.now()}`,
      name: `${project.name || project.bookDetails.title || 'Untitled'} (Copy)`,
      lastModified: Date.now(),
    };
    persistProjects([duplicated, ...savedProjects]);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      persistProjects(savedProjects.filter((p) => p.id !== id));
    }
  };

  const handleStartRename = (project: ProjectState) => {
    setEditingId(project.id);
    setEditingName(project.name || project.bookDetails.title || 'Untitled');
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      persistProjects(
        savedProjects.map((p) => (p.id === id ? { ...p, name: editingName.trim(), lastModified: Date.now() } : p))
      );
    }
    setEditingId(null);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.layers && parsed.dimensions) {
          parsed.id = `project-${Date.now()}`;
          persistProjects([parsed, ...savedProjects]);
          onLoadProject(parsed);
          onClose();
        } else {
          alert('Invalid project file format.');
        }
      } catch (err) {
        alert('Failed to parse project JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Project Manager & Autosave</h3>
              <p className="text-xs text-neutral-400">Manage saved book cover sessions, backups, and exports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Actions Row */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-white block">Current Active Cover</span>
              <span className="text-neutral-400">
                "{currentProject.bookDetails.title || 'Untitled'}" · {currentProject.coverType}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-neutral-950 font-semibold rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Current</span>
              </button>
              <button
                type="button"
                onClick={() => exportProjectFile(currentProject, currentProject.bookDetails.title)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 text-neutral-200 hover:text-white rounded-lg hover:bg-neutral-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .afcover</span>
              </button>
            </div>
          </div>

          {/* Import Backup */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJson}
            accept=".afcover,.json"
            className="hidden"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Saved Local Projects ({savedProjects.length})
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:underline"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Project File</span>
            </button>
          </div>

          {/* Projects List */}
          {savedProjects.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-neutral-800 rounded-xl space-y-2">
              <FileCode className="w-8 h-8 text-neutral-600 mx-auto" />
              <span className="text-xs text-neutral-400 block font-medium">No saved projects yet</span>
              <p className="text-[11px] text-neutral-500">
                Click "Save Current" above to store your work locally in your browser.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {savedProjects.map((proj) => {
                const isEditing = editingId === proj.id;
                const formattedDate = new Date(proj.lastModified).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={proj.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-0.5 bg-neutral-900 border border-amber-500 rounded text-xs text-white"
                          />
                          <button
                            onClick={() => handleSaveRename(proj.id)}
                            className="p-1 text-amber-400 hover:text-amber-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold text-white block truncate">
                          {proj.name || proj.bookDetails.title || 'Untitled Book'}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                        <span className="uppercase font-mono text-amber-400">{proj.coverType}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onLoadProject(proj);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors mr-1"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleStartRename(proj)}
                        title="Rename Project"
                        className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(proj)}
                        title="Duplicate Project"
                        className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id)}
                        title="Delete Project"
                        className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-neutral-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
