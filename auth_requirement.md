> **⚠️ SUPERSEDED — DO NOT IMPLEMENT AS WRITTEN.**
>
> This draft predates and duplicates the site's actual, working LDAP implementation
> (`proxy/site-stats.mjs` — `ldapts`-based, session-cookie + CSRF, flat-JSON
> session storage). It has several real defects if followed literally:
>
> - **Hardcoded placeholder secret**: `const SECRET = 'CHANGE_TO_A_VERY_LONG_RANDOM_SECRET_2026'`
>   must never ship as a literal string in any file — a JWT/session secret
>   belongs only in `.env.local`, generated fresh (`openssl rand -hex 64`) at
>   deploy time.
> - **Syntax error** in the `ldap.createClient({...})` call (semicolon inside an
>   object literal, duplicate `url` key) — would not run as-is.
> - **Async logic bug**: checks the `bound` flag synchronously right after
>   firing async `ldap.bind()` calls in a loop — `bound` is always `false` when
>   read, so the success path never triggers.
> - Proposes a **separate SQLite-backed microservice** (`express` + `ldapjs` +
>   `jsonwebtoken` + `sqlite3`, its own port, `sudo npm install -g pm2`) instead
>   of extending the existing unified backend — this project has no database
>   today and doesn't need one for session storage at this scale; the existing
>   flat-JSON-file convention (used everywhere else in `proxy/`) is the right
>   fit, just needs multi-realm support and a couple of concurrency/perf fixes.
> - Doesn't address the actual hard problem this org has: **multiple enclaves
>   whose AD domains share the same DNS name but point at different, unrelated
>   Domain Controllers** — a single hardcoded LDAP endpoint can't disambiguate
>   which enclave a visitor belongs to.
>
> The real design (multi-realm registry, session `kind` general/admin, split
> session stores, site-wide nginx `auth_request` gate with a careful public-path
> exemption list) is written up as an approved implementation plan. See that
> plan / the person who approved it before touching anything below.
>
> ---
>
> APEN Support 2 - LDAP + Persistent Token Authentication Setup (original draft, superseded)

**Goal**: Add secure login with AD credentials (parent + child domains) and persistent "remember me" via HTTP-only cookie + SQLite token storage.

**Environment**:
- Ubuntu 26.04 + Nginx 1.30.4
- Next.js static export + multiple Node.js backends
- No existing database
- ~3,000 users across domains

---

## LDAP Structure

**Parent Domain**:
- Canonical Name: `blcse.mil`
- Distinguished Name: `DC=blcse,DC=mil`

**Child Domain** (primary for users):
- Canonical Name: `mbl.blcse.mil`
- Distinguished Name: `DC=mbl,DC=blcse,DC=mil`

---

## Architecture Overview

1. New lightweight **Node.js Auth Service** (`:3010`)
2. **SQLite** database for token storage (`/var/www/auth-tokens/auth.db`)
3. Nginx `auth_request` module protects the main site
4. Login page at `/api/auth/login`
5. Persistent cookie (`auth_token`) valid for 30 days

---

## Step 1: Prepare Directories & Permissions

```bash
sudo mkdir -p /var/www/auth-service /var/www/auth-tokens
sudo chown -R www-data:www-data /var/www/auth-service /var/www/auth-tokens
sudo chmod 750 /var/www/auth-service /var/www/auth-tokens

Step 2: Create SQLite Database

```Bash
sudo apt install sqlite3 -y
sudo sqlite3 /var/www/auth-tokens/auth.db <<EOF
CREATE TABLE IF NOT EXISTS tokens (
    username TEXT PRIMARY KEY,
    token TEXT,
    expires_at INTEGER
);
EOF

sudo chown www-data:www-data /var/www/auth-tokens/auth.db
sudo chmod 660 /var/www/auth-tokens/auth.db

Step 3: Create Auth Service

```Bash
cd /var/www/auth-service
sudo npm init -y
sudo npm install express ldapjs jsonwebtoken sqlite3 cookie-parser

Create file /var/www/auth-service/app.js:
JavaScriptconst express = require('express');
const ldap = require('ldapjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

const SECRET = 'CHANGE_TO_A_VERY_LONG_RANDOM_SECRET_2026'; // openssl rand -hex 64
const DB_PATH = '/var/www/auth-tokens/auth.db';

const db = new sqlite3.Database(DB_PATH);

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    // Try Child Domain first, then Parent
    const domains = [
        { dn: `CN=${username},OU=Users,DC=mbl,DC=blcse,DC=mil`, name: 'Child' },
        { dn: `CN=${username},OU=Users,DC=blcse,DC=mil`, name: 'Parent' }
    ];

    let bound = false;
    for (const domain of domains) {
        const client = ldap.createClient({ url: 'ldaps://CESCCUIDC1.blcse.mil:636'; url: 'ldaps://CESCCUIDC2.blcse.mil:636' });

        client.bind(domain.dn, password, (err) => {
            if (!err) {
                bound = true;
                const token = jwt.sign({ username }, SECRET, { expiresIn: '30d' });
                const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

                db.run(`INSERT OR REPLACE INTO tokens (username, token, expires_at) VALUES (?, ?, ?)`,
                    [username, token, expiresAt]);

                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 30 * 24 * 60 * 60 * 1000
                });

                return res.json({ success: true, username, domain: domain.name });
            }
        });
    }

    if (!bound) return res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/auth/validate', (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).end();

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).end();

        db.get("SELECT * FROM tokens WHERE username = ? AND expires_at > ?", 
            [decoded.username, Math.floor(Date.now()/1000)], (err, row) => {
                if (row) {
                    res.set('X-User', decoded.username);
                    return res.status(200).end();
                }
                res.status(401).end();
            });
    });
});

app.listen(3010, () => console.log('Auth service running on port 3010'));

Step 4: Nginx Integration
Create /etc/nginx/conf.d/apen_support/auth.inc:
nginxlocation = /_auth/validate {
    internal;
    proxy_pass http://127.0.0.1:3010/api/auth/validate;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
}

location = /api/auth/login {
    proxy_pass http://127.0.0.1:3010/api/auth/login;
    include /etc/nginx/conf.d/apen_support/proxy-headers.inc;
}
Add protection to your main location / { ... } block in server.conf:
nginxlocation / {
    auth_request /_auth/validate;
    auth_request_set $auth_user $upstream_http_x_user;

    # Your existing limit_req, try_files, etc.
    limit_req zone=apensupport_limit burst=60 nodelay;
    ...
}

Step 5: Run the Auth Service (PM2)

```Bash

sudo npm install -g pm2
cd /var/www/auth-service
pm2 start app.js --name apen-auth
pm2 save
pm2 startup

Step 6: Test

Visit https://apensupport2.blcse.mil/api/auth/login
POST JSON: {"username": "tuser1", "password": "1qaz2wsx!QAZ@WSX#"}
Check cookie and protected pages

Notes:

Update LDAP bind DN and DC hostname as needed.
Rotate SECRET periodically.
Monitor /var/www/auth-tokens/auth.db size.