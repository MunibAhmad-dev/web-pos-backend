const mongoose = require('mongoose');

// Cached across warm serverless invocations (Vercel) so we don't reconnect on every request.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
