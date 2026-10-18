const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_DB_PATH || './data/surveys_agent.db';
const resolvedPath = path.resolve(__dirname, '..', dbPath);
const dir = path.dirname(resolvedPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(resolvedPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE NOT NULL,
    uid TEXT,
    from_addr TEXT,
    subject TEXT,
    received_date TEXT,
    status TEXT DEFAULT 'pending',
    is_survey INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS extracted_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    project_no TEXT,
    project_name TEXT,
    platform_name TEXT,
    project_cpi REAL DEFAULT 0.0,
    currency TEXT DEFAULT 'USD',
    project_quota INTEGER DEFAULT 0,
    project_loi INTEGER DEFAULT 0,
    project_ir INTEGER DEFAULT 0,
    project_click_url TEXT,
    project_content TEXT,
    target_country TEXT,
    synced_to_mysql INTEGER DEFAULT 0,
    mysql_project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id) REFERENCES processed_emails(message_id)
  );

  CREATE INDEX IF NOT EXISTS idx_processed_emails_message_id ON processed_emails(message_id);
  CREATE INDEX IF NOT EXISTS idx_extracted_surveys_project_no ON extracted_surveys(project_no);
`);

// Safe migrations for folder_name
try {
  db.exec(`ALTER TABLE processed_emails ADD COLUMN folder_name TEXT;`);
} catch (e) {}
try {
  db.exec(`ALTER TABLE extracted_surveys ADD COLUMN folder_name TEXT;`);
} catch (e) {}

class SQLiteManager {
  static isEmailProcessed(messageId) {
    if (!messageId) return false;
    const row = db.prepare('SELECT id, status FROM processed_emails WHERE message_id = ?').get(messageId);
    return !!row;
  }

  static logProcessedEmail({ messageId, uid, fromAddr, subject, receivedDate, status, isSurvey, errorMessage, folderName }) {
    const stmt = db.prepare(`
      INSERT INTO processed_emails (message_id, uid, from_addr, subject, received_date, status, is_survey, error_message, folder_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO UPDATE SET
        status = excluded.status,
        is_survey = excluded.is_survey,
        error_message = excluded.error_message,
        folder_name = excluded.folder_name
    `);
    const info = stmt.run(
      messageId,
      uid || null,
      fromAddr || '',
      subject || '',
      receivedDate || new Date().toISOString(),
      status || 'completed',
      isSurvey ? 1 : 0,
      errorMessage || null,
      folderName || null
    );
    return info.lastInsertRowid;
  }

  static saveExtractedSurvey(data) {
    const stmt = db.prepare(`
      INSERT INTO extracted_surveys (
        message_id, project_no, project_name, platform_name, folder_name,
        project_cpi, currency, project_quota, project_loi, project_ir,
        project_click_url, project_content, target_country, synced_to_mysql, mysql_project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.message_id || null,
      data.project_no || `SURV_${Date.now()}`,
      data.project_name || 'Email Survey Offer',
      data.platform_name || 'EmailCustom',
      data.folder_name || null,
      data.project_cpi || 0.0,
      data.currency || 'USD',
      data.project_quota || 0,
      data.project_loi || 0,
      data.project_ir || 0,
      data.project_click_url || '',
      data.project_content || '',
      data.target_country || '',
      data.synced_to_mysql ? 1 : 0,
      data.mysql_project_id || null
    );

    return info.lastInsertRowid;
  }

  static markSyncedToMysql(surveyId, mysqlProjectId) {
    db.prepare(`
      UPDATE extracted_surveys
      SET synced_to_mysql = 1, mysql_project_id = ?
      WHERE id = ?
    `).run(mysqlProjectId, surveyId);
  }

  static getStats() {
    const totalEmails = db.prepare('SELECT COUNT(*) as count FROM processed_emails').get().count;
    const surveyEmails = db.prepare('SELECT COUNT(*) as count FROM processed_emails WHERE is_survey = 1').get().count;
    const totalSurveys = db.prepare('SELECT COUNT(*) as count FROM extracted_surveys').get().count;
    const syncedSurveys = db.prepare('SELECT COUNT(*) as count FROM extracted_surveys WHERE synced_to_mysql = 1').get().count;
    const recent = db.prepare('SELECT * FROM extracted_surveys ORDER BY id DESC LIMIT 5').all();

    return {
      totalEmails,
      surveyEmails,
      totalSurveys,
      syncedSurveys,
      recent
    };
  }

  static resetDatabase() {
    db.exec(`
      DELETE FROM extracted_surveys;
      DELETE FROM processed_emails;
      VACUUM;
    `);
    return true;
  }
}

module.exports = { db, SQLiteManager };
