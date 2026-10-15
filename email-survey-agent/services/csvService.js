const fs = require('fs');
const path = require('path');

class CSVService {
  static getCsvPath() {
    const rawPath = process.env.CSV_EXPORT_PATH || './exports/surveys_extracted.csv';
    const resolvedPath = path.resolve(__dirname, '..', rawPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return resolvedPath;
  }

  static escapeField(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  static appendSurvey(survey) {
    const filePath = this.getCsvPath();
    const headers = [
      'Extracted At',
      'Mailbox Folder',
      'Platform/Company',
      'Project No',
      'Survey Name',
      'CPI / Payout',
      'Currency',
      'Quota',
      'LOI (Minutes)',
      'IR (%)',
      'Target Country',
      'Click / Entry URL',
      'Requirements / Notes',
      'Email Message ID'
    ];

    if (!fs.existsSync(filePath)) {
      const headerLine = headers.map(h => this.escapeField(h)).join(',') + '\n';
      fs.writeFileSync(filePath, headerLine, 'utf8');
    }

    const row = [
      new Date().toISOString(),
      survey.folder_name || 'INBOX',
      survey.platform_name || '',
      survey.project_no || '',
      survey.project_name || '',
      survey.project_cpi || 0.0,
      survey.currency || 'USD',
      survey.project_quota || 0,
      survey.project_loi || 0,
      survey.project_ir || 0,
      survey.target_country || '',
      survey.project_click_url || '',
      survey.project_content || '',
      survey.message_id || ''
    ];

    const rowLine = row.map(val => this.escapeField(val)).join(',') + '\n';
    fs.appendFileSync(filePath, rowLine, 'utf8');
    return filePath;
  }
}

module.exports = CSVService;
