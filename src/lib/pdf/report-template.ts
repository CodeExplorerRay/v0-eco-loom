import { formatGapValue, parseStoredGapItems } from '@/lib/gap-analysis';
import type { Report, ReportTrendPoint, StoredGapItem } from '@/lib/types';
import { getReportModeProfile } from '@/lib/reports/report-modes';
import { escapeHtml, formatCo2e, formatCompactCo2e, getCo2eDisplay } from '@/lib/utils';

interface ReportTemplateData {
  report: Report;
  theme?: 'light' | 'dark';
}

export function generateReportHTML({ report, theme = 'light' }: ReportTemplateData): string {
  const isDark = theme === 'dark';
  
  // Color scheme based on theme
  const colors = {
    primary: '#059669',
    primaryDark: '#047857',
    accent: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    success: '#22C55E',
    bgPrimary: isDark ? '#111827' : '#FFFFFF',
    bgSecondary: isDark ? '#1F2937' : '#F3F4F6',
    bgTertiary: isDark ? '#374151' : '#E5E7EB',
    textPrimary: isDark ? '#F9FAFB' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? '#374151' : '#E5E7EB',
    headerBg: '#059669',
    headerText: '#FFFFFF',
    tableRowAlt: isDark ? '#1F2937' : '#F9FAFB',
  };

  // Format dates
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Format number with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calculate change percentage
  const getChangePercent = () => {
    if (!report.previousPeriodEmissions || !report.totalEmissions) return null;
    const change = ((report.previousPeriodEmissions - report.totalEmissions) / report.previousPeriodEmissions) * 100;
    return change;
  };

  const changePercent = getChangePercent();

  // Parse gaps identified
  const parseGaps = (): StoredGapItem[] => {
    return parseStoredGapItems(report.gapsIdentified);
  };

  const gaps = parseGaps();
  const safeTitle = escapeHtml(report.title);
  const safeReportingPeriod = escapeHtml(report.reportingPeriod || 'N/A');
  const safeSummary = escapeHtml(report.summary || 'No summary available.');
  const safeStatus = escapeHtml(report.status?.toUpperCase() || 'DRAFT');
  const safeRecommendations = escapeHtml(report.recommendations || '');
  const safeNotionPageId = escapeHtml(report.notionPageId || '');
  const provenance = report.factorProvenance;
  const analytics = report.reportAnalytics;
  const methodology = report.methodologyMetadata;
  const boundary = report.boundaryMetadata;
  const facilityBanner =
    boundary?.includedDepartments && boundary.includedDepartments.length === 1
      ? boundary.includedDepartments[0]
      : null;
  const appendices = report.appendices;
  const verifierManifest = report.verifierManifest;
  const modeProfile = getReportModeProfile(report.reportMode);
  const safeCoverKicker = escapeHtml(modeProfile.coverKicker);
  const safeCoverStatement = escapeHtml(modeProfile.coverStatement);
  const safeDisclaimerText = escapeHtml(modeProfile.disclaimerText);
  const safeCoverBrandLabel = escapeHtml(modeProfile.coverBrandLabel);
  const totalEmissionsDisplay = getCo2eDisplay(report.totalEmissions);
  const previousEmissionsDisplay = getCo2eDisplay(report.previousPeriodEmissions);
  const formatEnumLabel = (value: string | undefined) =>
    value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'N/A';
  const formatOptionalEmissions = (value: number | undefined) =>
    formatCo2e(value);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return colors.success;
      case 'draft': return colors.warning;
      case 'archived': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string | undefined) => {
    switch (severity?.toLowerCase()) {
      case 'high': return colors.danger;
      case 'medium': return colors.warning;
      case 'low': return colors.success;
      default: return colors.textSecondary;
    }
  };

  // Get gap status color (for department-based gaps)
  const getGapStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'at_risk': return colors.danger;
      case 'needs_attention': return colors.warning;
      case 'on_track': return colors.success;
      case 'achieved': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const renderContributionRows = (
    items: Array<{ label: string; entries: number; emissions: number; percent: number }>,
    barColor: string
  ) =>
    items
      .map(
        (item) => `
          <div class="chart-row">
            <div class="chart-row-head">
              <div>
                <p class="chart-label">${escapeHtml(item.label)}</p>
                <p class="chart-meta">${item.entries} entries · ${item.percent.toFixed(1)}%</p>
              </div>
              <p class="chart-value">${formatCo2e(item.emissions)}</p>
            </div>
            <div class="chart-track">
              <div class="chart-fill" style="width: ${Math.max(item.percent, 4)}%; background: ${barColor};"></div>
            </div>
          </div>
        `
      )
      .join('');

  const renderDepartmentRows = (
    items: Array<{
      departmentName: string;
      departmentCode?: string | null;
      entries: number;
      emissions: number;
      percent: number;
      verifiedEntries: number;
      overriddenEntries: number;
    }>
  ) =>
    items
      .map(
        (item) => `
          <div class="chart-row">
            <div class="chart-row-head">
              <div>
                <p class="chart-label">${escapeHtml(item.departmentName)}${item.departmentCode ? ` (${escapeHtml(item.departmentCode)})` : ''}</p>
                <p class="chart-meta">${item.entries} entries · ${item.verifiedEntries} verified · ${item.overriddenEntries} overrides</p>
              </div>
              <p class="chart-value">${formatCo2e(item.emissions)}</p>
            </div>
            <div class="chart-track">
              <div class="chart-fill" style="width: ${Math.max(item.percent, 4)}%; background: linear-gradient(90deg, #7C3AED, #A78BFA);"></div>
            </div>
          </div>
        `
      )
      .join('');

  const renderTrendBars = (points: ReportTrendPoint[]) => {
    const maxEmissions = Math.max(...points.map((point) => point.emissions), 1);
    return points
      .map((point) => {
        const height = Math.max((point.emissions / maxEmissions) * 100, 8);
        return `
          <div class="trend-column">
            <p class="trend-value">${formatCompactCo2e(point.emissions)}</p>
            <div class="trend-column-shell">
              <div class="trend-column-fill" style="height: ${height}%;"></div>
            </div>
            <p class="trend-label">${escapeHtml(point.label)}</p>
            <p class="trend-meta">${point.entryCount} entries</p>
          </div>
        `;
      })
      .join('');
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: ${colors.bgPrimary};
      color: ${colors.textPrimary};
      line-height: 1.5;
      font-size: 10pt;
    }
    
    .page {
      width: 8.5in;
      background-color: ${colors.bgPrimary};
    }
    
    .cover-page {
      height: 11in;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 0.5in;
    }
    
    .content-page {
      min-height: 11in;
      padding: 0.5in;
      padding-bottom: 0.4in;
      position: relative;
    }
    
    .logo {
      font-size: 22pt;
      font-weight: 700;
      color: ${colors.primary};
      margin-bottom: 36px;
      letter-spacing: 2px;
    }
    
    .logo span {
      color: ${isDark ? colors.textPrimary : '#374151'};
    }
    
    .report-title {
      font-size: 24pt;
      font-weight: 700;
      color: ${colors.textPrimary};
      margin-bottom: 12px;
      line-height: 1.3;
    }
    
    .report-type {
      font-size: 12pt;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 3px;
      margin-bottom: 12px;
    }

    .cover-kicker {
      font-size: 10pt;
      color: ${colors.primary};
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
      font-weight: 600;
    }

    .cover-brand-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      padding: 6px 14px;
      border-radius: 999px;
      background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cover-statement {
      max-width: 480px;
      margin: 0 auto 8px auto;
      font-size: 10pt;
      line-height: 1.6;
      color: ${colors.textSecondary};
    }
    
    .divider {
      width: 180px;
      height: 3px;
      background: linear-gradient(90deg, ${colors.primary}, ${colors.accent});
      margin: 24px auto;
    }
    
    .meta-table {
      width: 380px;
      margin: 24px auto;
      border-collapse: collapse;
    }
    
    .meta-table td {
      padding: 10px 14px;
      border: 1px solid ${colors.border};
      font-size: 10pt;
    }
    
    .meta-table td:first-child {
      background-color: ${colors.bgSecondary};
      font-weight: 600;
      width: 150px;
    }
    
    .footer-brand {
      margin-top: auto;
      padding-top: 48px;
      text-align: center;
    }
    
    .footer-brand p {
      color: ${colors.textSecondary};
      font-size: 9pt;
    }

    .cover-disclaimer {
      max-width: 520px;
      margin: 20px auto 0 auto;
      font-size: 8.5pt;
      line-height: 1.6;
      color: ${colors.textSecondary};
      background-color: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 10px;
      padding: 12px 14px;
      text-align: left;
    }

    .facility-banner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid ${isDark ? '#14532D' : '#A7F3D0'};
      background: ${isDark ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.28), rgba(17, 24, 39, 0.92))' : 'linear-gradient(135deg, #ECFDF5, #FFFFFF)'};
    }

    .facility-banner-kicker {
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: ${colors.primary};
      margin-bottom: 6px;
    }

    .facility-banner-title {
      font-size: 14pt;
      font-weight: 700;
      color: ${colors.textPrimary};
      margin-bottom: 4px;
    }

    .facility-banner-meta {
      font-size: 9pt;
      color: ${colors.textSecondary};
    }

    .facility-banner-detail {
      display: flex;
      flex-direction: column;
      gap: 6px;
      justify-content: center;
      text-align: right;
    }

    .facility-banner-label {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: ${colors.textSecondary};
    }

    .facility-banner-value {
      font-size: 9pt;
      color: ${colors.textPrimary};
      word-break: break-word;
    }
    
    .section {
      margin-bottom: 20px;
    }
    
    .section-title {
      font-size: 14pt;
      font-weight: 700;
      color: ${colors.primary};
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${colors.primary};
    }
    
    .summary-text {
      font-size: 10pt;
      line-height: 1.6;
      color: ${colors.textPrimary};
      text-align: justify;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 16px 0;
    }
    
    .metric-card {
      background-color: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 6px;
      padding: 14px;
      text-align: center;
    }
    
    .metric-card.primary {
      border-left: 3px solid ${colors.primary};
    }
    
    .metric-card.secondary {
      border-left: 3px solid ${colors.textSecondary};
    }
    
    .metric-card.success {
      border-left: 3px solid ${colors.success};
    }
    
    .metric-card.warning {
      border-left: 3px solid ${colors.warning};
    }
    
    .metric-value {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 2px;
    }
    
    .metric-value.positive {
      color: ${colors.success};
    }
    
    .metric-value.negative {
      color: ${colors.danger};
    }
    
    .metric-label {
      font-size: 8pt;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .metric-unit {
      font-size: 9pt;
      color: ${colors.textSecondary};
      margin-top: 2px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
    }
    
    .data-table th {
      background-color: ${colors.headerBg};
      color: ${colors.headerText};
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
    }
    
    .data-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${colors.border};
      font-size: 9pt;
    }
    
    .data-table tr:nth-child(even) td {
      background-color: ${colors.tableRowAlt};
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .recommendation-box {
      background-color: ${isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5'};
      border: 1px solid ${colors.primary};
      border-radius: 6px;
      padding: 14px;
      margin: 12px 0;
    }

    .provenance-callout {
      background-color: ${isDark ? 'rgba(14, 116, 144, 0.14)' : '#ECFEFF'};
      border: 1px solid ${isDark ? '#155E75' : '#A5F3FC'};
      border-radius: 6px;
      padding: 14px;
      margin: 12px 0;
    }

    .provenance-meta {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 14px 0;
    }

    .provenance-metric {
      background-color: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 6px;
      padding: 12px;
    }

    .provenance-metric-label {
      font-size: 8pt;
      color: ${colors.textSecondary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .provenance-metric-value {
      font-size: 14pt;
      font-weight: 700;
      color: ${colors.textPrimary};
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin: 14px 0;
    }

    .chart-card {
      background-color: ${colors.bgSecondary};
      border: 1px solid ${colors.border};
      border-radius: 6px;
      padding: 12px;
    }

    .chart-card.full-width {
      grid-column: 1 / -1;
    }

    .chart-card h4 {
      color: ${colors.textPrimary};
      font-size: 10pt;
      margin-bottom: 4px;
    }

    .chart-card p.chart-description {
      color: ${colors.textSecondary};
      font-size: 8pt;
      margin-bottom: 10px;
    }

    .chart-row {
      margin-bottom: 10px;
    }

    .chart-row:last-child {
      margin-bottom: 0;
    }

    .chart-row-head {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 4px;
    }

    .chart-label {
      font-size: 9pt;
      font-weight: 600;
      color: ${colors.textPrimary};
    }

    .chart-meta {
      font-size: 8pt;
      color: ${colors.textSecondary};
    }

    .chart-value {
      font-size: 8pt;
      font-weight: 600;
      color: ${colors.textPrimary};
      white-space: nowrap;
    }

    .chart-track {
      height: 8px;
      border-radius: 999px;
      background-color: ${colors.bgTertiary};
      overflow: hidden;
    }

    .chart-fill {
      height: 100%;
      border-radius: 999px;
    }

    .trend-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
      align-items: end;
      min-height: 180px;
    }

    .trend-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .trend-column-shell {
      width: 100%;
      height: 110px;
      border-radius: 12px 12px 0 0;
      background-color: ${isDark ? '#0F172A' : '#ECFDF5'};
      display: flex;
      align-items: flex-end;
      padding: 0 6px;
    }

    .trend-column-fill {
      width: 100%;
      border-radius: 10px 10px 0 0;
      background: linear-gradient(180deg, #6EE7B7 0%, #059669 100%);
      min-height: 8px;
    }

    .trend-value,
    .trend-label,
    .trend-meta {
      text-align: center;
    }

    .trend-value {
      font-size: 8pt;
      font-weight: 600;
      color: ${colors.textPrimary};
    }

    .trend-label {
      font-size: 8pt;
      font-weight: 600;
      color: ${colors.textPrimary};
    }

    .trend-meta {
      font-size: 7pt;
      color: ${colors.textSecondary};
    }
    
    .recommendation-box h4 {
      color: ${colors.primary};
      margin-bottom: 8px;
      font-size: 11pt;
    }
    
    .notion-status {
      background-color: ${isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5'};
      border: 1px solid ${colors.primary};
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .notion-status-icon {
      width: 20px;
      height: 20px;
      background-color: ${colors.success};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      flex-shrink: 0;
      font-size: 10pt;
    }
    
    .document-footer {
      position: absolute;
      bottom: 0;
      left: 0.5in;
      right: 0.5in;
      padding-top: 12px;
      border-top: 1px solid ${colors.border};
      text-align: center;
    }
    
    .document-footer p {
      color: ${colors.textSecondary};
      font-size: 8pt;
      margin: 3px 0;
    }
    
    .content-wrapper {
      padding-bottom: 60px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .cover-page {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .content-page {
        page-break-before: avoid;
        page-break-inside: avoid;
      }
      .section {
        page-break-inside: avoid;
      }
      .data-table {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="page cover-page">
    <div class="logo">ECO-<span>LOOM</span></div>
    <div class="cover-brand-chip">${safeCoverBrandLabel}</div>
    
    <h1 class="report-title">${safeTitle}</h1>
    <p class="report-type">${typeof report.reportType === 'string' ? report.reportType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Report'} Report</p>
    <p class="cover-kicker">${safeCoverKicker}</p>
    <p style="font-size: 11pt; color: ${colors.textSecondary}; margin-bottom: 10px;">${escapeHtml(modeProfile.label)} • ${escapeHtml(modeProfile.audienceLabel)}</p>
    <p class="cover-statement">${safeCoverStatement}</p>
    
    <div class="divider"></div>
    
    <table class="meta-table">
      <tr>
        <td>Reporting Period</td>
        <td>${safeReportingPeriod}</td>
      </tr>
      <tr>
        <td>Report Status</td>
        <td>
          <span class="status-badge" style="background-color: ${getStatusColor(report.status)}20; color: ${getStatusColor(report.status)};">
            ${safeStatus}
          </span>
        </td>
      </tr>
      <tr>
        <td>Generated Date</td>
        <td>${formatDate(report.createdAt)}</td>
      </tr>
      <tr>
        <td>Document Version</td>
        <td>1.0</td>
      </tr>
      <tr>
        <td>Approval Status</td>
        <td>${escapeHtml(report.approvalStatus || 'pending_review')}</td>
      </tr>
    </table>

    <div class="cover-disclaimer">
      <strong>Use Note:</strong> ${safeDisclaimerText}
    </div>
    
    <div class="footer-brand">
      <p>Powered by Eco-Loom ESG & Carbon Compliance Platform</p>
    </div>
  </div>
  
  <!-- Content Page -->
  <div class="page content-page">
    <div class="content-wrapper">
      ${facilityBanner ? `
      <div class="facility-banner">
        <div>
          <p class="facility-banner-kicker">Facility Report Banner</p>
          <p class="facility-banner-title">${escapeHtml(facilityBanner.name)}${facilityBanner.code ? ` (${escapeHtml(facilityBanner.code)})` : ''}</p>
          <p class="facility-banner-meta">${escapeHtml(facilityBanner.country || 'Country not set')}</p>
        </div>
        <div class="facility-banner-detail">
          <div>
            <p class="facility-banner-label">Facility Address</p>
            <p class="facility-banner-value">${escapeHtml(facilityBanner.address || 'Address not recorded')}</p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Executive Summary -->
      <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <p class="summary-text">${safeSummary}</p>
      </div>

      ${modeProfile.showBoundary && boundary ? `
      <div class="section">
        <h2 class="section-title">Reporting Boundary</h2>
        <div class="recommendation-box">
          <h4>Boundary Summary</h4>
          <p class="summary-text">${escapeHtml(boundary.boundarySummary)}</p>
        </div>
        ${boundary.organizationalBoundaryMethod ? `
        <table class="data-table">
          <tbody>
            <tr>
              <td style="font-weight: 600; width: 180px;">Boundary Method</td>
              <td>${escapeHtml(formatEnumLabel(boundary.organizationalBoundaryMethod))}</td>
            </tr>
          </tbody>
        </table>
        ` : ''}
        ${boundary.includedDepartments.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Included Facility / Site</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            ${boundary.includedDepartments.map((department) => `
              <tr>
                <td>${escapeHtml(department.name)}</td>
                <td>${escapeHtml(department.code || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        <div class="recommendation-box">
          <h4>Exclusions</h4>
          <p class="summary-text">${escapeHtml(boundary.exclusions)}</p>
        </div>
        ${boundary.organizationalBoundaryNotes ? `
        <div class="recommendation-box">
          <h4>Boundary Notes</h4>
          <p class="summary-text">${escapeHtml(boundary.organizationalBoundaryNotes)}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${modeProfile.showMethodology && methodology ? `
      <div class="section">
        <h2 class="section-title">Methodology</h2>
        <table class="data-table">
          <tbody>
            <tr>
              <td style="font-weight: 600; width: 180px;">Reporting Standard</td>
              <td>${escapeHtml(methodology.reportingStandard)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">GWP Basis</td>
              <td>${escapeHtml(methodology.gwpBasis)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Factor Source Policy</td>
              <td>${escapeHtml(methodology.factorSourcePolicy)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Override Policy</td>
              <td>${escapeHtml(methodology.overridePolicy)}</td>
            </tr>
            <tr>
              <td style="font-weight: 600;">Report Owner</td>
              <td>${escapeHtml(methodology.reportOwnerName || 'Unassigned')}${methodology.reportOwnerEmail ? ` (${escapeHtml(methodology.reportOwnerEmail)})` : ''}</td>
            </tr>
            ${methodology.reportRecipients && methodology.reportRecipients.length > 0 ? `
            <tr>
              <td style="font-weight: 600;">Default Recipients</td>
              <td>${escapeHtml(methodology.reportRecipients.join(', '))}</td>
            </tr>
            ` : ''}
            ${methodology.approvalWorkflow ? `
            <tr>
              <td style="font-weight: 600;">Approval Workflow</td>
              <td>${escapeHtml(methodology.approvalWorkflow)}</td>
            </tr>
            ` : ''}
            ${methodology.approvalStatus ? `
            <tr>
              <td style="font-weight: 600;">Approval Status</td>
              <td>${escapeHtml(methodology.approvalStatus)}${methodology.approvedByName ? ` by ${escapeHtml(methodology.approvedByName)}` : ''}${methodology.approvedAt ? ` on ${formatDate(methodology.approvedAt)}` : ''}</td>
            </tr>
            ` : ''}
            ${methodology.baseYear !== undefined ? `
            <tr>
              <td style="font-weight: 600;">Base Year</td>
              <td>${escapeHtml(String(methodology.baseYear))}</td>
            </tr>
            ` : ''}
            ${methodology.baseYearRecalculationPolicy ? `
            <tr>
              <td style="font-weight: 600;">Base Year Recalculation Policy</td>
              <td>${escapeHtml(methodology.baseYearRecalculationPolicy)}</td>
            </tr>
            ` : ''}
            ${methodology.scope2Method ? `
            <tr>
              <td style="font-weight: 600;">Scope 2 Method</td>
              <td>${escapeHtml(formatEnumLabel(methodology.scope2Method))}</td>
            </tr>
            ` : ''}
            ${methodology.scope2LocationBasedEmissions !== undefined ? `
            <tr>
              <td style="font-weight: 600;">Scope 2 Location-Based Emissions</td>
              <td>${escapeHtml(formatOptionalEmissions(methodology.scope2LocationBasedEmissions))}</td>
            </tr>
            ` : ''}
            ${methodology.scope2MarketBasedEmissions !== undefined ? `
            <tr>
              <td style="font-weight: 600;">Scope 2 Market-Based Emissions</td>
              <td>${escapeHtml(formatOptionalEmissions(methodology.scope2MarketBasedEmissions))}</td>
            </tr>
            ` : ''}
            ${methodology.scope2DisclosureNotes ? `
            <tr>
              <td style="font-weight: 600;">Scope 2 Disclosure Notes</td>
              <td>${escapeHtml(methodology.scope2DisclosureNotes)}</td>
            </tr>
            ` : ''}
            ${methodology.scope2InstrumentNotes ? `
            <tr>
              <td style="font-weight: 600;">Contractual Instrument Notes</td>
              <td>${escapeHtml(methodology.scope2InstrumentNotes)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
        ${methodology.baseYearNotes ? `
        <div class="recommendation-box">
          <h4>Base Year Notes</h4>
          <p class="summary-text">${escapeHtml(methodology.baseYearNotes)}</p>
        </div>
        ` : ''}
        <div class="recommendation-box">
          <h4>Methodology Notes</h4>
          <p class="summary-text">${escapeHtml(methodology.methodologyNotes)}</p>
        </div>
      </div>
      ` : ''}
      
      <!-- Emissions Overview -->
      <div class="section">
        <h2 class="section-title">Emissions Overview</h2>
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-label">Current Period</div>
            <div class="metric-value" style="color: ${colors.primary};">${totalEmissionsDisplay.formattedValue}</div>
            <div class="metric-unit">${totalEmissionsDisplay.unit ?? ''}</div>
          </div>
          <div class="metric-card secondary">
            <div class="metric-label">Previous Period</div>
            <div class="metric-value">${previousEmissionsDisplay.formattedValue}</div>
            <div class="metric-unit">${previousEmissionsDisplay.unit ?? ''}</div>
          </div>
          <div class="metric-card ${changePercent !== null && changePercent >= 0 ? 'success' : 'warning'}">
            <div class="metric-label">Change</div>
            <div class="metric-value ${changePercent !== null && changePercent >= 0 ? 'positive' : 'negative'}">
              ${changePercent !== null ? `${changePercent >= 0 ? '&#8595;' : '&#8593;'} ${Math.abs(changePercent).toFixed(1)}%` : 'N/A'}
            </div>
            <div class="metric-unit">${changePercent !== null ? (changePercent >= 0 ? 'decrease' : 'increase') : ''}</div>
          </div>
        </div>
      </div>

      ${modeProfile.showOperationalBreakdown && analytics ? `
      <div class="section">
        <h2 class="section-title">Operational Breakdown</h2>
        <div class="metrics-grid">
          <div class="metric-card primary">
            <div class="metric-label">Entries Reviewed</div>
            <div class="metric-value" style="color: ${colors.primary};">${analytics.quality.totalEntries}</div>
            <div class="metric-unit">reporting period records</div>
          </div>
          <div class="metric-card success">
            <div class="metric-label">Verification Rate</div>
            <div class="metric-value positive">${analytics.quality.verificationRate.toFixed(1)}%</div>
            <div class="metric-unit">${analytics.quality.verifiedEntries} verified entries</div>
          </div>
          <div class="metric-card secondary">
            <div class="metric-label">Evidence Coverage</div>
            <div class="metric-value">${analytics.quality.evidenceCoverageRate.toFixed(1)}%</div>
            <div class="metric-unit">${analytics.quality.entriesWithSourceDocument} entries with source docs</div>
          </div>
        </div>

        ${analytics.intensityMetrics.length > 0 ? `
        <div class="metrics-grid">
          ${analytics.intensityMetrics.map((metric) => `
            <div class="metric-card primary">
              <div class="metric-label">${escapeHtml(metric.label)}</div>
              <div class="metric-value" style="color: ${colors.primary};">${formatNumber(metric.value)}</div>
              <div class="metric-unit">${escapeHtml(metric.unit)}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="chart-grid">
          ${analytics.breakdownByScope.length > 0 ? `
          <div class="chart-card">
            <h4>Scope Contribution</h4>
            <p class="chart-description">Share of report emissions by GHG scope.</p>
            ${renderContributionRows(analytics.breakdownByScope, 'linear-gradient(90deg, #059669, #34D399)')}
          </div>
          ` : ''}

          ${analytics.breakdownBySourceType.length > 0 ? `
          <div class="chart-card">
            <h4>Source Contribution</h4>
            <p class="chart-description">Highest-emitting source types in the reporting period.</p>
            ${renderContributionRows(analytics.breakdownBySourceType.slice(0, 5), 'linear-gradient(90deg, #0EA5E9, #7DD3FC)')}
          </div>
          ` : ''}

          ${analytics.topDepartments.length > 0 ? `
          <div class="chart-card full-width">
            <h4>Facility Leaderboard</h4>
            <p class="chart-description">Facilities and sites ranked by emissions contribution, with verification and override context.</p>
            ${renderDepartmentRows(analytics.topDepartments)}
          </div>
          ` : ''}

          ${analytics.monthlyTrend.length > 0 ? `
          <div class="chart-card full-width">
            <h4>Monthly Trend</h4>
            <p class="chart-description">Rolling monthly activity leading into the current report window.</p>
            <div class="trend-grid" style="grid-template-columns: repeat(${analytics.monthlyTrend.length}, minmax(0, 1fr));">
              ${renderTrendBars(analytics.monthlyTrend)}
            </div>
          </div>
          ` : ''}
        </div>

        ${analytics.breakdownByScope.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Entries</th>
              <th>Emissions</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.breakdownByScope.map((item) => `
              <tr>
                <td>${escapeHtml(item.label)}</td>
                <td>${item.entries}</td>
                <td>${formatCo2e(item.emissions)}</td>
                <td>${item.percent.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${analytics.breakdownBySourceType.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Source Type</th>
              <th>Entries</th>
              <th>Emissions</th>
              <th>Share</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.breakdownBySourceType.map((item) => `
              <tr>
                <td>${escapeHtml(item.label)}</td>
                <td>${item.entries}</td>
                <td>${formatCo2e(item.emissions)}</td>
                <td>${item.percent.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${analytics.breakdownByDepartment.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Facility / Site</th>
              <th>Entries</th>
              <th>Emissions</th>
              <th>Verified</th>
              <th>Overrides</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.breakdownByDepartment.slice(0, 6).map((item) => `
              <tr>
                <td>${escapeHtml(item.departmentName)}${item.departmentCode ? ` (${escapeHtml(item.departmentCode)})` : ''}</td>
                <td>${item.entries}</td>
                <td>${formatCo2e(item.emissions)}</td>
                <td>${item.verifiedEntries}</td>
                <td>${item.overriddenEntries}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
      ` : ''}

      ${modeProfile.showFactorProvenance && provenance ? `
      <div class="section">
        <h2 class="section-title">Factor Provenance & Methodology</h2>
        <div class="provenance-callout">
          <p class="summary-text">${escapeHtml(provenance.summaryText)}</p>
        </div>
        <div class="provenance-meta">
          <div class="provenance-metric">
            <div class="provenance-metric-label">Official Factors</div>
            <div class="provenance-metric-value">${provenance.officialEntries}</div>
          </div>
          <div class="provenance-metric">
            <div class="provenance-metric-label">Supplemental Factors</div>
            <div class="provenance-metric-value">${provenance.supplementalEntries}</div>
          </div>
          <div class="provenance-metric">
            <div class="provenance-metric-label">Overrides</div>
            <div class="provenance-metric-value">${provenance.overriddenEntries}</div>
          </div>
          <div class="provenance-metric">
            <div class="provenance-metric-label">Unknown Provenance</div>
            <div class="provenance-metric-value">${provenance.unknownEntries}</div>
          </div>
        </div>
        ${provenance.methodologyList.length > 0 ? `
        <div class="recommendation-box">
          <h4>Methodologies Used</h4>
          <p class="summary-text">${escapeHtml(provenance.methodologyList.join(', '))}</p>
        </div>
        ` : ''}
        ${provenance.sourceBreakdown.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Factor Source</th>
              <th>Entries</th>
              <th>Emissions Covered</th>
            </tr>
          </thead>
          <tbody>
            ${provenance.sourceBreakdown.map((item) => `
              <tr>
                <td>${escapeHtml(item.label)}</td>
                <td>${item.entries}</td>
                <td>${formatCo2e(item.emissions)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
      ` : ''}

      ${modeProfile.showAppendices && appendices ? `
      <div class="section">
        <h2 class="section-title">Assurance Appendices</h2>

        ${verifierManifest ? `
        <div class="recommendation-box">
          <h4>Verifier Manifest</h4>
          <p class="summary-text">
            Exported ${formatDate(verifierManifest.exportedAt)} with ${verifierManifest.evidenceRowCount} evidence rows,
            ${verifierManifest.factorRegisterCount} factor records, ${verifierManifest.overrideCount} overrides, and
            ${verifierManifest.unresolvedIssueCount} unresolved quality issues.
          </p>
          <p class="summary-text" style="margin-top: 8px; font-size: 9pt;">
            Checksum: ${escapeHtml(verifierManifest.checksum)}
          </p>
        </div>
        ` : ''}

        ${appendices.unresolvedQualityIssues.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Issue</th>
              <th>Severity</th>
              <th>Description</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${appendices.unresolvedQualityIssues.map((issue) => `
              <tr>
                <td>${escapeHtml(issue.title)}</td>
                <td>${escapeHtml(issue.severity.toUpperCase())}</td>
                <td>${escapeHtml(issue.description)}</td>
                <td>${issue.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : `
        <div class="recommendation-box">
          <h4>Quality Status</h4>
          <p class="summary-text">No unresolved quality issues were identified in the appendix package.</p>
        </div>
        `}

        ${appendices.factorRegister.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Factor Source</th>
              <th>Family</th>
              <th>Year</th>
              <th>Methodology</th>
              <th>Entries</th>
              <th>Emissions</th>
            </tr>
          </thead>
          <tbody>
            ${appendices.factorRegister.slice(0, 8).map((item) => `
              <tr>
                <td>${escapeHtml(item.sourceLabel)}</td>
                <td>${escapeHtml(item.sourceFamily || 'Unknown')}</td>
                <td>${item.year ?? '—'}</td>
                <td>${escapeHtml(item.methodology || 'Unspecified')}</td>
                <td>${item.entries}</td>
                <td>${formatCo2e(item.emissions)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${appendices.overrideRegister.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Entry ID</th>
              <th>Date</th>
              <th>Facility / Site</th>
              <th>Override Reason</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            ${appendices.overrideRegister.slice(0, 8).map((item) => `
              <tr>
                <td>${escapeHtml(item.entryId)}</td>
                <td>${formatDate(item.transactionDate)}</td>
                <td>${escapeHtml(item.departmentName || 'Unassigned site')}</td>
                <td>${escapeHtml(item.overrideReason)}</td>
                <td>${escapeHtml(item.overrideBy || 'Unknown')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        ${appendices.evidenceRegister.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Entry ID</th>
              <th>Date</th>
              <th>Source Type</th>
              <th>Facility / Site</th>
              <th>Source Document</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            ${appendices.evidenceRegister.slice(0, 10).map((item) => `
              <tr>
                <td>${escapeHtml(item.entryId)}</td>
                <td>${formatDate(item.transactionDate)}</td>
                <td>${escapeHtml(item.sourceType)}</td>
                <td>${escapeHtml(item.departmentName || 'Unassigned site')}</td>
                <td>${escapeHtml(item.sourceDocument || 'Missing')}</td>
                <td>${item.verified ? 'Yes' : 'No'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
      ` : ''}
      
      ${gaps.length > 0 ? `
      <!-- Gap Analysis -->
      <div class="section">
        <h2 class="section-title">Gap Analysis</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>Gap</th>
              <th>Facility / Site</th>
              <th>Current State</th>
              <th>Gap Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${gaps.map((gap: StoredGapItem) => {
              if (gap.kind === 'goal') {
                return `
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${escapeHtml(gap.goal)}</div>
                      <div style="color: ${colors.textSecondary}; font-size: 8pt;">${escapeHtml(gap.summary)}</div>
                    </td>
                    <td>${escapeHtml(gap.department)}</td>
                    <td>${formatGapValue(gap.currentValue, gap.currentUnit)} vs ${formatGapValue(gap.targetValue, gap.targetUnit)}</td>
                    <td>${formatGapValue(gap.gapValue, gap.gapUnit)}</td>
                    <td>
                      <span class="status-badge" style="background-color: ${getGapStatusColor(gap.status)}20; color: ${getGapStatusColor(gap.status)};">
                        ${escapeHtml(gap.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))}
                      </span>
                    </td>
                  </tr>
                `;
              }

              if (gap.kind === 'issue') {
                return `
                  <tr>
                    <td>
                      <div style="font-weight: 600;">${escapeHtml(gap.issue)}</div>
                      <div style="color: ${colors.textSecondary}; font-size: 8pt;">${escapeHtml(gap.summary)}</div>
                    </td>
                    <td>${escapeHtml(gap.facility)}</td>
                    <td>Qualitative issue</td>
                    <td>Review needed</td>
                    <td>
                      <span class="status-badge" style="background-color: ${getSeverityColor(gap.severity)}20; color: ${getSeverityColor(gap.severity)};">
                        ${escapeHtml(gap.severity.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                `;
              }

              return `
                <tr>
                  <td>
                    <div style="font-weight: 600;">${escapeHtml(gap.area)}</div>
                    <div style="color: ${colors.textSecondary}; font-size: 8pt;">${escapeHtml(gap.summary)}</div>
                  </td>
                  <td>Cross-functional</td>
                  <td>Tracked area</td>
                  <td>${gap.gapValue !== undefined ? formatGapValue(gap.gapValue, gap.gapUnit || 'units') : 'Review needed'}</td>
                  <td>
                    <span class="status-badge" style="background-color: ${getSeverityColor(gap.severity)}20; color: ${getSeverityColor(gap.severity)};">
                      ${escapeHtml(gap.severity.toUpperCase())}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${report.recommendations ? `
      <!-- Recommendations -->
      <div class="section">
        <h2 class="section-title">Operational Insights</h2>
        <div class="recommendation-box">
          <h4>Priority Actions</h4>
          <p class="summary-text">${safeRecommendations}</p>
        </div>
      </div>
      ` : ''}
      
      ${report.notionPageId ? `
      <!-- Notion Integration Status -->
      <div class="section">
        <h2 class="section-title">Notion Integration Status</h2>
        <div class="notion-status">
          <div class="notion-status-icon">&#10003;</div>
          <div>
            <p style="font-weight: 600; margin-bottom: 4px;">Synced to Notion</p>
            <p style="color: ${colors.textSecondary}; font-size: 10pt;">
              Page ID: ${safeNotionPageId}<br>
              Last Synced: ${formatDate(report.notionSyncedAt)}
            </p>
          </div>
        </div>
      </div>
      ` : ''}
    </div>
    
    <!-- Document Footer -->
    <div class="document-footer">
      <p>This report was generated by Eco-Loom ESG & Carbon Compliance Platform.</p>
      <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <p>Prepared with Eco-Loom sustainability reporting analytics.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
