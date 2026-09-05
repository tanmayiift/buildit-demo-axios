'use strict';

// Node-only: relies on the built-in `http2` module. Browser/react-native
// builds replace `lib/adapters/http.js` (the sole importer) with `lib/helpers/null.js`
// via the `browser` package.json field, so this module is never reached in
// those environments. Do not import it from any browser-reachable code path.

import http2 from 'http2';
import util from 'util';

// A new session is only created when no pooled one can be reused, which
// happens whenever the connect options differ. A process that varies those
// options -- per-request `ca`, `servername`, `sessionTimeout`, a proxy agent --
// therefore grows one entry per distinct option set for the lifetime of the
// process. Bound it.
const DEFAULT_MAX_SESSIONS_PER_AUTHORITY = 8;

class Http2Sessions {
  constructor(maxSessionsPerAuthority) {
    this.sessions = Object.create(null);
    this.maxSessionsPerAuthority = maxSessionsPerAuthority || DEFAULT_MAX_SESSIONS_PER_AUTHORITY;
  }

  getSession(authority, options) {
    options = Object.assign(
      Object.create(null),
      {
        sessionTimeout: 1000,
      },
      options
    );

    let authoritySessions = this.sessions[authority];

    if (authoritySessions) {
      let len = authoritySessions.length;

      for (let i = 0; i < len; i++) {
        const [sessionHandle, sessionOptions] = authoritySessions[i];
        if (
          !sessionHandle.destroyed &&
          !sessionHandle.closed &&
          util.isDeepStrictEqual(sessionOptions, options)
        ) {
          return sessionHandle;
        }
      }
    }

    const session = http2.connect(authority, options);

    let removed;
    let timer;

    const removeSession = () => {
      if (removed) {
        return;
      }

      removed = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      let entries = authoritySessions,
        len = entries.length,
        i = len;

      while (i--) {
        if (entries[i][0] === session) {
          if (len === 1) {
            delete this.sessions[authority];
          } else {
            entries.splice(i, 1);
          }
          if (!session.closed) {
            session.close();
          }
          return;
        }
      }
    };

    const originalRequestFn = session.request;

    const { sessionTimeout } = options;

    if (sessionTimeout != null) {
      let streamsCount = 0;

      session.request = function () {
        const stream = originalRequestFn.apply(this, arguments);

        streamsCount++;

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        stream.once('close', () => {
          if (!--streamsCount) {
            timer = setTimeout(() => {
              timer = null;
              removeSession();
            }, sessionTimeout);
          }
        });

        return stream;
      };
    }

    session.once('close', removeSession);
    session.once('error', removeSession);

    let entry = [session, options];

    authoritySessions
      ? authoritySessions.push(entry)
      : (authoritySessions = this.sessions[authority] = [entry]);

    // Evict the oldest entries once this authority is over the cap, so the pool
    // stays bounded. Evicted sessions leave the pool and are never handed out
    // again; their own `close`/`error` handlers still run the normal teardown.
    while (authoritySessions.length > this.maxSessionsPerAuthority) {
      authoritySessions.shift();
    }

    return session;
  }
}

export default Http2Sessions;
