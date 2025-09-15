const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database connection
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/database.db' 
  : path.join(__dirname, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // Create tenants table
      db.run(`
        CREATE TABLE IF NOT EXISTS tenants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
          tenant_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        )
      `);

      // Create notes table
      db.run(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          tenant_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tenant_id) REFERENCES tenants (id),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Insert default tenants
      const tenants = [
        { name: 'Acme Corporation', slug: 'acme', plan: 'free' },
        { name: 'Globex Corporation', slug: 'globex', plan: 'free' }
      ];

      for (const tenant of tenants) {
        await new Promise((resolve) => {
          db.run(
            'INSERT OR IGNORE INTO tenants (name, slug, plan) VALUES (?, ?, ?)',
            [tenant.name, tenant.slug, tenant.plan],
            resolve
          );
        });
      }

      // Get tenant IDs
      const getTenantId = (slug) => {
        return new Promise((resolve) => {
          db.get('SELECT id FROM tenants WHERE slug = ?', [slug], (err, row) => {
            resolve(row ? row.id : null);
          });
        });
      };

      const acmeTenantId = await getTenantId('acme');
      const globexTenantId = await getTenantId('globex');

      // Create default users
      const defaultPassword = await bcrypt.hash('password', 10);
      
      const users = [
        { email: 'admin@acme.test', password_hash: defaultPassword, role: 'admin', tenant_id: acmeTenantId },
        { email: 'user@acme.test', password_hash: defaultPassword, role: 'member', tenant_id: acmeTenantId },
        { email: 'admin@globex.test', password_hash: defaultPassword, role: 'admin', tenant_id: globexTenantId },
        { email: 'user@globex.test', password_hash: defaultPassword, role: 'member', tenant_id: globexTenantId }
      ];

      for (const user of users) {
        await new Promise((resolve) => {
          db.run(
            'INSERT OR IGNORE INTO users (email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?)',
            [user.email, user.password_hash, user.role, user.tenant_id],
            resolve
          );
        });
      }

      console.log('Database initialized successfully');
      resolve();
    });
  });
};

// Helper functions for database operations
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

module.exports = {
  db,
  initializeDatabase,
  query,
  get,
  run
};