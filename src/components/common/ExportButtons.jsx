import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Check } from 'lucide-react';
import { getAuditReportCSV, getAuditReportJSON } from '../../services/api';
import { downloadFile } from '../../utils/formatters';
import { useAuditContext } from '../../context/AuditContext';

export default function ExportButtons({ auditId, domain = 'report' }) {
  const { addToast } = useAuditContext();
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const csv = await getAuditReportCSV(auditId);
      downloadFile(csv, `ipv6-audit-${domain}-${Date.now()}.csv`, 'text/csv');
      addToast('CSV Report downloaded successfully', 'success');
    } catch {
      addToast('Failed to generate CSV report', 'error');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleDownloadJson = async () => {
    setDownloadingJson(true);
    try {
      const data = await getAuditReportJSON(auditId);
      downloadFile(JSON.stringify(data, null, 2), `ipv6-audit-${domain}-${Date.now()}.json`, 'application/json');
      addToast('JSON Report downloaded successfully', 'success');
    } catch {
      addToast('Failed to generate JSON report', 'error');
    } finally {
      setDownloadingJson(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleDownloadCsv}
        disabled={downloadingCsv}
        className="btn btn-secondary btn-sm"
        title="Download CSV audit report"
      >
        <FileSpreadsheet size={14} color="var(--cyber-emerald)" />
        <span>{downloadingCsv ? 'Generating...' : 'Export CSV'}</span>
      </button>

      <button
        onClick={handleDownloadJson}
        disabled={downloadingJson}
        className="btn btn-secondary btn-sm"
        title="Download complete JSON audit payload"
      >
        <FileJson size={14} color="var(--cyber-cyan)" />
        <span>{downloadingJson ? 'Generating...' : 'Export JSON'}</span>
      </button>
    </div>
  );
}
