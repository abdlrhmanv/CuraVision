import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { reportsApi } from '@/lib/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface ReportEditorProps {
  reportId?: string;
  initialReport: string;
  onSave: (newReport: string) => Promise<void>;
  onApprove: () => Promise<void>;
  isApproving: boolean;
  status: string;
  patientVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => Promise<void>;
}

export function ReportEditor({ reportId, initialReport, onSave, onApprove, isApproving, status, patientVisible, onToggleVisibility }: ReportEditorProps) {
  const [reportText, setReportText] = useState(initialReport);
  const [prevInitialReport, setPrevInitialReport] = useState(initialReport);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Sync initial report
  if (initialReport !== prevInitialReport) {
    setPrevInitialReport(initialReport);
    setReportText(initialReport);
  }

  // Polling for concurrency lock
  useEffect(() => {
    if (!reportId || status === 'PUBLISHED') return;
    
    let isMounted = true;
    const pingLock = async () => {
      try {
        const data = await reportsApi.pingLock(reportId);
        if (isMounted) {
          if (data.locked) {
            setLockWarning(data.message || 'Report is currently being edited by another doctor.');
          } else {
            setLockWarning(null);
          }
        }
      } catch (err) {
        console.error('Failed to ping lock', err);
      }
    };

    pingLock();
    const interval = setInterval(pingLock, 30000); // Ping every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [reportId, status]);

  const handleSave = useCallback(async (textToSave: string, isAutoSave = false) => {
    if (textToSave.trim().length === 0 || textToSave.length > 100000) return;
    
    if (isAutoSave) setAutoSaveStatus('saving');
    else setIsSaving(true);
    
    try {
      await onSave(textToSave);
      if (isAutoSave) {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error(err);
      if (isAutoSave) setAutoSaveStatus('idle');
    } finally {
      if (!isAutoSave) setIsSaving(false);
    }
  }, [onSave]);

  // Auto-save logic (debounced 30s)
  useEffect(() => {
    if (status === 'PUBLISHED') return;
    if (reportText === prevInitialReport) return;

    const timer = setTimeout(() => {
      handleSave(reportText, true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [reportText, prevInitialReport, status, handleSave]);

  const handleCancel = () => {
    setReportText(prevInitialReport);
  };

  const isTextEmpty = reportText.trim().length === 0;
  const isTextTooLong = reportText.length > 100000;
  const isInvalid = isTextEmpty || isTextTooLong;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Medical Report Editor</CardTitle>
        {lockWarning && (
          <div className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-medium">
            ⚠️ {lockWarning}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex border-b border-border">
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'edit' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-foreground'}`}
              onClick={() => setActiveTab('edit')}
            >
              Edit Markdown
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'preview' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-foreground'}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <div className="flex-1" />
            {autoSaveStatus === 'saving' && <span className="text-xs text-muted flex items-center">Saving...</span>}
            {autoSaveStatus === 'saved' && <span className="text-xs text-green-600 flex items-center">Saved!</span>}
          </div>

          {activeTab === 'edit' ? (
            <div>
              <textarea
                className={`w-full min-h-[300px] p-4 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm ${isInvalid ? 'border-red-500' : ''}`}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                disabled={status === 'PUBLISHED' || !!lockWarning}
                aria-label="Medical Report Editor"
                placeholder="Enter report content here..."
              />
              {isTextEmpty && <p className="text-red-500 text-xs mt-1">Report text cannot be empty.</p>}
              {isTextTooLong && <p className="text-red-500 text-xs mt-1">Report text exceeds maximum length of 100,000 characters.</p>}
            </div>
          ) : (
            <div className="w-full min-h-[300px] p-4 border rounded-md bg-surface text-sm overflow-auto prose prose-sm max-w-none">
              <ReactMarkdown>{reportText || '*Empty report*'}</ReactMarkdown>
            </div>
          )}

          {status !== 'PUBLISHED' && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="ghost" onClick={handleCancel} disabled={reportText === prevInitialReport || isSaving || !!lockWarning}>
                Discard Changes
              </Button>
              <div className="flex space-x-2">
                <Button variant="secondary" onClick={() => handleSave(reportText)} isLoading={isSaving} disabled={isInvalid || reportText === prevInitialReport || !!lockWarning}>
                  Save Draft
                </Button>
                <Button variant="primary" onClick={onApprove} isLoading={isApproving} disabled={isInvalid || isSaving || !!lockWarning}>
                  Approve & Publish
                </Button>
              </div>
            </div>
          )}
          {status === 'PUBLISHED' && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted">
                This report has been published and cannot be edited.
              </div>
              
              {onToggleVisibility && patientVisible !== undefined && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-text">Visible to Patient</span>
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(!patientVisible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-2 focus:ring-offset-bg ${
                      patientVisible ? 'bg-green' : 'bg-muted'
                    }`}
                    role="switch"
                    aria-checked={patientVisible}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        patientVisible ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
