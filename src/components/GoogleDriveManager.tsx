import React, { useState, useEffect } from 'react';
import { googleSignIn, logout, auth } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Folder, File, Upload, Trash2, RefreshCw, LogIn, LogOut, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export default function GoogleDriveManager() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAccessToken(null);
        setFiles([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        fetchFiles(res.accessToken);
      }
    } catch (err: any) {
      console.warn('Sign-in notice:', err?.message || err);
      setStatusMessage(err?.message || 'Failed to authenticate Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setFiles([]);
  };

  const fetchFiles = async (token = accessToken) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setStatusMessage('Google Drive synced successfully');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const errData = await res.json();
        setStatusMessage(`Drive API error: ${errData.error?.message || 'Failed to fetch files'}`);
      }
    } catch (err: any) {
      setStatusMessage(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !accessToken) return;

    try {
      setUploading(true);
      const metadata = {
        name: selectedFile.name,
        mimeType: selectedFile.type || 'application/octet-stream'
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', selectedFile);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      if (res.ok) {
        setStatusMessage(`File "${selectedFile.name}" uploaded successfully to Google Drive`);
        setSelectedFile(null);
        fetchFiles(accessToken);
      } else {
        const err = await res.json();
        setStatusMessage(`Upload failed: ${err.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!accessToken) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}" from Google Drive? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (res.ok) {
        setStatusMessage(`File "${fileName}" deleted from Google Drive`);
        fetchFiles(accessToken);
      } else {
        setStatusMessage('Failed to delete file');
      }
    } catch (err: any) {
      setStatusMessage(`Delete error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111114] border border-neutral-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-900/40 text-blue-400">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-medium text-white tracking-wider uppercase">Google Drive Center</h3>
            <p className="text-[10px] font-mono text-neutral-400">Cloud SQL & Workspace Integration</p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center space-x-3">
            <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded text-xs font-mono transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-medium transition cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Connect Google Drive</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="mb-4 p-3 rounded-lg bg-blue-950/30 border border-blue-900/40 text-[11px] font-mono text-blue-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          {(statusMessage.includes('blocked') || statusMessage.includes('iframe') || statusMessage.includes('Pop-up')) && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700/60 px-2 py-1 rounded transition shrink-0 underline"
            >
              Open in New Tab
            </a>
          )}
        </div>
      )}

      {user && accessToken ? (
        <div className="space-y-4">
          {/* File Upload Form */}
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-xs text-neutral-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full sm:w-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-white font-mono text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            </button>
          </form>

          {/* Drive Files List */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Drive Files ({files.length})</span>
            <button
              onClick={() => fetchFiles()}
              disabled={loading}
              className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
              title="Refresh Drive"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {files.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 font-mono text-xs">
                {loading ? 'Fetching files from Drive...' : 'No files found in Google Drive.'}
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2.5 bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800/80 rounded-lg text-xs font-mono transition">
                  <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                    <File className="w-4 h-4 text-blue-400 shrink-0" />
                    <a
                      href={file.webViewLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-200 hover:text-blue-400 truncate hover:underline"
                    >
                      {file.name}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDelete(file.id, file.name)}
                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded transition cursor-pointer shrink-0"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-neutral-900/30 rounded-lg border border-neutral-800/50">
          <p className="text-xs font-mono text-neutral-400 mb-3">Connect your Google Account to access, upload, and manage files in Google Drive.</p>
          <button
            onClick={handleSignIn}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-medium transition inline-flex items-center space-x-2 cursor-pointer shadow-lg shadow-blue-950/50"
          >
            <LogIn className="w-4 h-4" />
            <span>Authenticate Google Drive</span>
          </button>
        </div>
      )}
    </div>
  );
}
