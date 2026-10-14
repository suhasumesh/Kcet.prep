import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

/**
 * Next.js reloads modules on every request in dev, so the connection is cached
 * on globalThis to avoid exhausting the Atlas connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cache = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

// Mongoose queues a query issued before the connection is up, and abandons
// the queue after bufferTimeoutMS. That defaults to 10s, which is *shorter*
// than the 15s server selection allowed below, so a cold start against a
// sleeping Atlas cluster failed with "buffering timed out" while the driver
// was still perfectly well looking for a server. Server selection has to be
// the thing that decides, so the buffer has to outlast it.
mongoose.set('bufferTimeoutMS', 25000);

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      // Each serverless instance opens its own pool, and a free Atlas cluster
      // allows 500 connections in total. A handful per instance is plenty for
      // the two or three queries a page makes, and leaves room for the app to
      // scale out under exam-season traffic.
      maxPoolSize: 5,
      // The seeder creates the indexes. Letting every cold start check them
      // again costs a round trip before the first query can run.
      autoIndex: process.env.NODE_ENV !== 'production',
    }).catch((err) => {
      // A rejected promise left in the cache would be handed to every later
      // request on this instance, so one unlucky cold start would keep
      // failing until the instance was recycled. Clear it so the next request
      // gets a fresh attempt.
      cache.promise = null;
      throw err;
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
