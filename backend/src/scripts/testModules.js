import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api';

const results = {
  passed: [],
  failed: []
};

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    results.passed.push(testName);
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    results.failed.push({ testName, details });
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🧪 NEXUSFLOW MODULE TEST SUITE: DEVICE MANAGEMENT & INGESTION');
  console.log('===============================================================\n');

  // Test 1: Health Check
  console.log('--> 1. Server Health Check');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const json = await res.json();
    assert(res.ok && json.status === 'healthy', 'Health check endpoint returns healthy');
  } catch (err) {
    assert(false, 'Health check endpoint', err.message);
  }

  // Test 2: Device Creation (POST /api/devices)
  console.log('\n--> 2. Device Registration API');
  const testDevId = 'TEST-UNIT-99';
  try {
    // Delete test device first if exists from previous run
    await fetch(`${API_BASE}/devices/${testDevId}`, { method: 'DELETE' });

    const createRes = await fetch(`${API_BASE}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: testDevId,
        name: 'Automated Test Unit 99',
        type: 'turbine',
        location: 'Test Bay 1',
        status: 'online',
        samplingRate: 1500
      })
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201 && createJson.success, 'Register new device (POST /api/devices)');
    assert(createJson.data.deviceId === testDevId, 'Device ID matches uppercase test identifier');

    // Duplicate ID validation test
    const dupRes = await fetch(`${API_BASE}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: testDevId,
        name: 'Duplicate Device',
        type: 'turbine'
      })
    });
    assert(dupRes.status === 409, 'Duplicate deviceId rejected with 409 Conflict');

    // Malformed body validation test (missing name)
    const malformedRes = await fetch(`${API_BASE}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'BAD'
        // missing name
      })
    });
    assert(malformedRes.status === 400, 'Missing required fields rejected with 400 Bad Request');
  } catch (err) {
    assert(false, 'Device Registration', err.message);
  }

  // Test 3: Device Listing & Filtering (GET /api/devices)
  console.log('\n--> 3. Device Listing & Search/Filter APIs');
  try {
    const listRes = await fetch(`${API_BASE}/devices`);
    const listJson = await listRes.json();
    assert(listRes.ok && Array.isArray(listJson.data), 'List devices returns array of devices');

    // Search filter
    const searchRes = await fetch(`${API_BASE}/devices?search=TEST-UNIT-99`);
    const searchJson = await searchRes.json();
    assert(searchJson.data.some(d => d.deviceId === testDevId), 'Search query finds newly registered device');

    // Type filter
    const typeRes = await fetch(`${API_BASE}/devices?type=turbine`);
    const typeJson = await typeRes.json();
    assert(typeJson.data.every(d => d.type === 'turbine'), 'Type filter returns only turbine category devices');
  } catch (err) {
    assert(false, 'Device Listing & Filter', err.message);
  }

  // Test 4: Device Update (PUT /api/devices/:deviceId)
  console.log('\n--> 4. Device Update API');
  try {
    const updateRes = await fetch(`${API_BASE}/devices/${testDevId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Unit 99 Name',
        status: 'offline',
        location: 'Storage Bay 4'
      })
    });
    const updateJson = await updateRes.json();
    assert(updateRes.ok && updateJson.data.name === 'Updated Unit 99 Name', 'Update device name');
    assert(updateJson.data.status === 'offline', 'Update device status to offline');
  } catch (err) {
    assert(false, 'Device Update', err.message);
  }

  // Test 5: Single Telemetry Ingestion (POST /api/telemetry)
  console.log('\n--> 5. Single Telemetry Ingestion API');
  try {
    const ingestRes = await fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'TURBINE-001',
        temperature: 77.4,
        humidity: 46.2,
        vibration: 2.3,
        pressure: 101.4,
        voltage: 221,
        status: 'nominal',
        isSimulated: false
      })
    });
    const ingestJson = await ingestRes.json();
    assert(ingestRes.status === 201 && ingestJson.success, 'Ingest valid reading for TURBINE-001');
    assert(ingestJson.data.temperature === 77.4, 'Ingested temperature matches payload');

    // Test unregistered device rejection
    const unregRes = await fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'NON-EXISTENT-DEVICE-XYZ',
        temperature: 70
      })
    });
    assert(unregRes.status === 404, 'Unregistered device rejected with 404 Not Found');

    // Test malformed payload rejection (invalid temperature out of bounds)
    const malformedTempRes = await fetch(`${API_BASE}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'TURBINE-001',
        temperature: 99999 // exceeds upper bound 1500°C
      })
    });
    assert(malformedTempRes.status === 400, 'Out-of-bounds temperature rejected with 400 Zod validation error');
  } catch (err) {
    assert(false, 'Single Telemetry Ingestion', err.message);
  }

  // Test 6: Batch Telemetry Ingestion (POST /api/telemetry/batch)
  console.log('\n--> 6. Batch Telemetry Ingestion API');
  try {
    const now = Date.now();
    const batchPayload = [
      { deviceId: 'TURBINE-001', temperature: 72.5, humidity: 44.0, vibration: 2.1, timestamp: new Date(now) },
      { deviceId: 'TURBINE-001', temperature: 73.1, humidity: 44.5, vibration: 2.2, timestamp: new Date(now + 1000) },
      { deviceId: 'TURBINE-002', temperature: 69.0, humidity: 48.0, vibration: 1.9, timestamp: new Date(now + 2000) }
    ];

    const batchRes = await fetch(`${API_BASE}/telemetry/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload)
    });
    const batchJson = await batchRes.json();
    assert(batchRes.status === 201 && batchJson.data.insertedCount === 3, 'Batch ingestion successfully wrote 3 records');

    // Batch with unregistered device
    const badBatchRes = await fetch(`${API_BASE}/telemetry/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { deviceId: 'TURBINE-001', temperature: 70 },
        { deviceId: 'GHOST-DEVICE-888', temperature: 70 }
      ])
    });
    assert(badBatchRes.status === 404, 'Batch with unregistered device rejected with 404');
  } catch (err) {
    assert(false, 'Batch Telemetry Ingestion', err.message);
  }

  // Test 7: Device Deletion (DELETE /api/devices/:deviceId)
  console.log('\n--> 7. Device Deletion API');
  try {
    const delRes = await fetch(`${API_BASE}/devices/${testDevId}`, { method: 'DELETE' });
    const delJson = await delRes.json();
    assert(delRes.status === 200 && delJson.success, 'Delete test device returns 200 OK');

    const verifyDelRes = await fetch(`${API_BASE}/devices/${testDevId}`);
    assert(verifyDelRes.status === 404, 'Verified device no longer exists (404)');
  } catch (err) {
    assert(false, 'Device Deletion', err.message);
  }

  // Test 8: Simulator Controller APIs
  console.log('\n--> 8. Demo Simulator Controller APIs');
  try {
    const statusRes = await fetch(`${API_BASE}/simulator/status`);
    const statusJson = await statusRes.json();
    assert(statusRes.ok && typeof statusJson.running === 'boolean', 'Simulator status endpoint returns boolean');

    const spikeRes = await fetch(`${API_BASE}/simulator/spike`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: 'TURBINE-001', temperature: 91.5 })
    });
    const spikeJson = await spikeRes.json();
    assert(spikeRes.ok && spikeJson.data.temperature === 91.5, 'Simulator spike endpoint injects simulated overheat reading');
    assert(spikeJson.data.metadata.isSimulated === true, 'Spike reading marked with isSimulated: true');
  } catch (err) {
    assert(false, 'Simulator APIs', err.message);
  }

  // Test 9: Verify Native MongoDB Time-Series Collection
  console.log('\n--> 9. Native MongoDB Time-Series Collection Verification');
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexusflow');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const telemetriesCol = collections.find(c => c.name === 'telemetries');
    assert(telemetriesCol !== undefined, 'Collection "telemetries" exists in MongoDB');
    assert(telemetriesCol.type === 'timeseries', 'Verified collection type is native "timeseries" (not standard collection)');

    const count = await db.collection('telemetries').countDocuments();
    assert(count > 0, `Time-series documents verified in collection (Current count: ${count.toLocaleString()})`);
    await mongoose.disconnect();
  } catch (err) {
    assert(false, 'MongoDB Time-Series Verification', err.message);
  }

  console.log('\n===============================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${results.passed.length} PASSED, ${results.failed.length} FAILED`);
  console.log('===============================================================\n');

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
