import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Telemetry } from '../models/telemetry.model.js';
import { connectDB } from '../config/db.js';

dotenv.config();

const RUN_BENCHMARK = async () => {
  console.log('\n===============================================================');
  console.log('⚡ NEXUSFLOW TIME-SERIES INGESTION THROUGHPUT BENCHMARK');
  console.log('Target Demonstration: High-Speed Batch Ingestion (MongoDB 8.x)');
  console.log('===============================================================\n');

  await connectDB();

  const testBatchSizes = [1000, 2500, 5000, 10000];

  for (const BATCH_SIZE of testBatchSizes) {
    console.log(`\n--> Preparing synthetic telemetry batch of ${BATCH_SIZE.toLocaleString()} records...`);

    const records = [];
    const baseTime = Date.now();
    const devices = ['BENCH-DEV-01', 'BENCH-DEV-02', 'BENCH-DEV-03', 'BENCH-DEV-04', 'BENCH-DEV-05'];

    for (let i = 0; i < BATCH_SIZE; i++) {
      records.push({
        timestamp: new Date(baseTime + i * 10),
        metadata: {
          deviceId: devices[i % devices.length],
          sensorType: 'turbine',
          location: 'Test Bay 9',
          unit: 'metric'
        },
        temperature: Number((70 + Math.random() * 20).toFixed(1)),
        humidity: Number((40 + Math.random() * 20).toFixed(1)),
        vibration: Number((2.0 + Math.random() * 2).toFixed(2)),
        pressure: 101.3,
        voltage: 220,
        status: 'nominal'
      });
    }

    console.log(`Executing batch insertMany into native Time-Series collection...`);
    const start = performance.now();
    
    let errorCount = 0;
    let insertedCount = 0;

    try {
      const result = await Telemetry.insertMany(records, { ordered: false });
      insertedCount = result.length;
    } catch (err) {
      if (err.insertedDocs) {
        insertedCount = err.insertedDocs.length;
      }
      errorCount = records.length - insertedCount;
      console.error('Batch error:', err.message);
    }

    const durationMs = performance.now() - start;
    const durationSec = durationMs / 1000;
    const throughput = Math.round(insertedCount / durationSec);

    console.log('---------------------------------------------------------------');
    console.log(`Batch Size:           ${BATCH_SIZE.toLocaleString()} records`);
    console.log(`Successfully Written: ${insertedCount.toLocaleString()} records`);
    console.log(`Errors / Dropped:     ${errorCount}`);
    console.log(`Elapsed Time:         ${durationMs.toFixed(2)} ms (${durationSec.toFixed(3)}s)`);
    console.log(`⚡ ACTUAL THROUGHPUT:   ${throughput.toLocaleString()} WRITES / SECOND`);
    console.log('---------------------------------------------------------------');
  }

  // Verify total count in collection
  const totalCount = await Telemetry.countDocuments();
  console.log(`\nVerified Total Time-Series Telemetry Documents in DB: ${totalCount.toLocaleString()}`);

  // Clean up benchmark test records
  console.log('Cleaning up benchmark records...');
  await Telemetry.deleteMany({ 'metadata.deviceId': /^BENCH-DEV-/ });
  console.log('Benchmark cleanup completed.\n');

  await mongoose.disconnect();
  process.exit(0);
};

RUN_BENCHMARK().catch(err => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
