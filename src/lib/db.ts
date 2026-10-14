import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

/**
 * One MongoDB connection per server instance, reused across requests.
 *
 * Next.js reloads modules on every request in dev, and a serverless platform
 * keeps an instance warm between invocations, so the connection is cached on
 * globalThis rather than reopened. A fresh connection per request would
 * exhaust the Atlas pool and add a TLS handshake to every page.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cache = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

// Never queue a query behind a connection that is not up.
//
// Buffering is meant for a long-lived server that briefly loses its database.
// Here it is actively harmful: every caller already awaits connectDB(), so a
// query can only find itself buffering when the socket died underneath us —
// and then the queue just sits there until it times out. That is what turned
// a dead connection into a 25-second page load and the confusing
// "Operation `users.findOne()` buffering timed out" that followed it.
//
// With buffering off, such a query fails at once, connectDB() opens a fresh
// connection on the next request, and a visitor sees one quick error instead
// of half a minute of nothing.
mongoose.set('bufferCommands', false);

/** mongoose.connection.readyState: 0 down, 1 up, 2 connecting, 3 closing. */
const CONNECTED = 1;
const CONNECTING = 2;

export async function connectDB() {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');

  const state = mongoose.connection.readyState;

  // The cached object is only worth returning if the socket under it is still
  // open. A serverless function is frozen between invocations and its idle
  // TCP connections get dropped by the network long before the process is
  // recycled; on the next request the cached handle still looks like a
  // connection, so returning it unchecked let every query queue up against a
  // dead socket and fail with "buffering timed out". Checking readyState is
  // what makes a warm instance recover instead of staying broken.
  if (cache.conn && state === CONNECTED) return cache.conn;

  // A connection already on its way: wait for that one rather than opening a
  // second pool alongside it.
  if (state === CONNECTING && cache.promise) return cache.promise;

  if (state !== CONNECTED && state !== CONNECTING) {
    cache.conn = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, {
        // Well under the platform's function timeout, so a connection problem
        // surfaces as a quick error the caller can report rather than the
        // whole invocation hanging and then being killed with nothing to show
        // for it. A reachable Atlas cluster answers in well under a second;
        // waiting longer than this only ever makes a failure slower.
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        // Retire sockets before the network does it silently. Shorter than the
        // idle timeout of a typical cloud NAT, so the pool refreshes itself
        // instead of holding handles that stopped working while we were frozen.
        maxIdleTimeMS: 60000,
        // Each instance opens its own pool and an Atlas free cluster allows 500
        // connections in total. A handful per instance is plenty for the two or
        // three queries a page makes, and leaves room to scale out in exam season.
        maxPoolSize: 5,
        minPoolSize: 0,
        // The seeder creates the indexes. Letting every cold start check them
        // again costs a round trip before the first query can run.
        autoIndex: process.env.NODE_ENV !== 'production',
      })
      .catch((err) => {
        // A rejected promise left in the cache would be handed to every later
        // request on this instance, so one unlucky cold start would keep
        // failing until the instance was recycled.
        cache.promise = null;
        throw err;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    cache.conn = null;
    throw err;
  }
  return cache.conn;
}
