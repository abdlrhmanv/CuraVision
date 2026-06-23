import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface ReportEditorProps {
  initialReport: string;
  onSave: (newReport: string) => Promise<void>;
  onApprove: () => Promise<void>;
  isApproving: boolean;
  status: string;
}

export function ReportEditor({ initialReport, onSave, onApprove, isApproving, status }: ReportEditorProps) {
  const [reportText, setReportText] = useState(initialReport);
  const [prevInitialReport, setPrevInitialReport] = useState(initialReport);
  const [isSaving, setIsSaving] = useState(false);

  if (initialReport !== prevInitialReport) {
    setPrevInitialReport(initialReport);
    setReportText(initialReport);
  }

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(reportText);
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Report Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <textarea
            className="w-full min-h-[300px] p-4 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={status === 'PUBLISHED'}
          />
          {status !== 'PUBLISHED' && (
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" onClick={handleSave} isLoading={isSaving}>
                Save Draft
              </Button>
              <Button variant="primary" onClick={onApprove} isLoading={isApproving}>
                Approve & Publish
              </Button>
            </div>
          )}
          {status === 'PUBLISHED' && (
            <div className="text-sm text-gray-500 text-right">
              This report has been published and cannot be edited.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
