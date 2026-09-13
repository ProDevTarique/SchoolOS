import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ClassItem, SectionItem, Student } from '../../types';
import { bulkImportStudents } from '../../services/studentService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  sections: SectionItem[];
  onImportSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  sections,
  onImportSuccess,
}) => {
  const { school, profile } = useAuth();
  const [inputText, setInputText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  // Filter sections for selected class
  const classSections = sections.filter((s) => s.classId === selectedClassId);

  const sampleCSV = `admissionNumber,fullName,gender,rollNumber,fatherName,fatherPhone,dateOfBirth
ADM-2025-101,Aakash Verma,MALE,1,Manoj Verma,+91 9811000101,2010-05-15
ADM-2025-102,Bhavya Singh,FEMALE,2,Gurpreet Singh,+91 9811000102,2010-08-22
ADM-2025-103,Chirag Reddy,MALE,3,Narayana Reddy,+91 9811000103,2010-11-04`;

  const handleLoadSample = () => {
    setInputText(sampleCSV);
    parseData(sampleCSV);
  };

  const parseData = (raw: string) => {
    try {
      const trimmed = raw.trim();
      if (!trimmed) {
        setParsedRows([]);
        return;
      }

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // JSON parsing
        const json = JSON.parse(trimmed);
        const rows = Array.isArray(json) ? json : [json];
        setParsedRows(rows);
      } else {
        // CSV parsing
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setParsedRows([]);
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
        const rows = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          return rowObj;
        });
        setParsedRows(rows);
      }
    } catch {
      setParsedRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      parseData(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!school?.id || !profile || parsedRows.length === 0) return;
    setLoading(true);
    setImportResult(null);

    try {
      const studentPayloads: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = parsedRows.map((r, i) => ({
        schoolId: school.id,
        admissionNumber: r.admissionNumber || `ADM-${Date.now()}-${i + 1}`,
        rollNumber: r.rollNumber || `${i + 1}`,
        fullName: r.fullName || r.name || 'Unnamed Student',
        gender: r.gender === 'FEMALE' || r.gender === 'Female' ? 'FEMALE' : r.gender === 'OTHER' ? 'OTHER' : 'MALE',
        dateOfBirth: r.dateOfBirth || '2010-01-01',
        sessionId: school.currentSessionId || '',
        classId: selectedClassId,
        sectionId: selectedSectionId || classSections[0]?.id || '',
        status: 'ACTIVE',
        fatherName: r.fatherName || '',
        fatherPhone: r.fatherPhone || '',
        motherName: r.motherName || '',
        motherPhone: r.motherPhone || '',
        parentEmail: r.parentEmail || r.email || '',
        address: r.address || '',
        city: r.city || school.city || '',
        state: r.state || school.state || '',
        pinCode: r.pinCode || '',
        admissionDate: r.admissionDate || new Date().toISOString().split('T')[0],
      }));

      const res = await bulkImportStudents(school.id, studentPayloads);
      setImportResult(res);

      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'STUDENTS_BULK_IMPORTED',
        module: 'Students',
        description: `Imported ${res.imported} students into class database.`,
      });

      if (res.imported > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      setImportResult({
        imported: 0,
        failed: parsedRows.length,
        errors: [err?.message || 'Import failed.'],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-3xl w-full p-6 sm:p-8 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Bulk Import Students
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Upload or paste CSV/JSON formatted student records. Preview and validate before executing import into database.
        </p>

        {importResult ? (
          <div className="space-y-4 py-4 text-center">
            {importResult.imported > 0 ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            ) : (
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            )}
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Import Completed: {importResult.imported} Created, {importResult.failed} Failed
            </h3>
            {importResult.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg text-left text-xs text-rose-700 dark:text-rose-300 space-y-1">
                {importResult.errors.map((e, idx) => (
                  <div key={idx}>• {e}</div>
                ))}
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setImportResult(null);
                  setParsedRows([]);
                  setInputText('');
                }}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg"
              >
                Import More
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Target Class & Section Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign To Class *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    const firstSec = sections.find((s) => s.classId === e.target.value);
                    setSelectedSectionId(firstSec?.id || '');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign To Section
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Auto/Default Section --</option>
                  {classSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload or Paste */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CSV or JSON Content
                </label>
                <div className="flex gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload .csv / .json</span>
                    <input
                      type="file"
                      accept=".csv,.json,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Paste Sample CSV
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  parseData(e.target.value);
                }}
                placeholder="Paste CSV rows with headers (admissionNumber, fullName, gender, rollNumber, fatherName, fatherPhone, dateOfBirth)"
                className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Live Data Preview */}
            {parsedRows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Preview Data ({parsedRows.length} students found)
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">Valid Syntax</span>
                </div>
                <div className="max-h-48 overflow-x-auto overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Admission No</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Gender</th>
                        <th className="py-2 px-3">Roll No</th>
                        <th className="py-2 px-3">Parent Name &amp; Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-1.5 px-3 text-slate-400">{i + 1}</td>
                          <td className="py-1.5 px-3 font-mono font-medium">{row.admissionNumber || 'Auto-generated'}</td>
                          <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-white">{row.fullName || row.name || 'Unnamed'}</td>
                          <td className="py-1.5 px-3">{row.gender || 'MALE'}</td>
                          <td className="py-1.5 px-3">{row.rollNumber || '—'}</td>
                          <td className="py-1.5 px-3 text-slate-500">
                            {row.fatherName || '—'} {row.fatherPhone ? `(${row.fatherPhone})` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Showing first 10 of {parsedRows.length} rows to be imported.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || parsedRows.length === 0}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Execute Bulk Import ({parsedRows.length})</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
