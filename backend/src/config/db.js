import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexusflow';
    await mongoose.connect(mongoUri);
    console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.host}/${mongoose.connection.name}`);

    const db = mongoose.connection.db;
    const allCollections = await db.listCollections().toArray();
    const existing = allCollections.find(c => c.name === 'telemetries');

    if (!existing) {
      console.log('[Database] Creating native Time-Series collection: "telemetries"...');
      await db.createCollection('telemetries', {
        timeseries: {
          timeField: 'timestamp',
          metaField: 'metadata',
          granularity: 'seconds'
        }
      });
      console.log('[Database] Native Time-Series collection created successfully.');
    } else {
      console.log(`[Database] Native Time-Series collection 'telemetries' exists. Type: ${existing.type}`);
    }

    // Secondary compound index on deviceId + timestamp for ultra-fast time-series queries
    try {
      const telemetryCollection = db.collection('telemetries');
      await telemetryCollection.createIndex({ 'metadata.deviceId': 1, timestamp: -1 });
    } catch (idxErr) {
      // Index might already exist
    }

  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    process.exit(1);
  }
};
