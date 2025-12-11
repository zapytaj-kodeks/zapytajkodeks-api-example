#!/usr/bin/env node

/**
 * API Load Tester for ZapytajKodeks
 * Tests non-streaming endpoint with multiple requests
 * 
 * Usage: node test.js [count] [concurrency]
 *   count       - number of requests to send (default: 100)
 *   concurrency - how many requests to run in parallel (default: 5)
 */

import 'dotenv/config';

const API_URL = "https://api.zapytajkodeks.pl/v1/ai/analysis";
const API_KEY = process.env.ZAPYTAJKODEKS_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: ZAPYTAJKODEKS_API_KEY is not set in .env file');
  process.exit(1);
}

// Sample questions to rotate through
const QUESTIONS = [
  "Jaki jest termin na złożenie odwołania od decyzji administracyjnej?",
  "Kiedy mogę poprosić sąd o warunkowe umorzenie sprawy karnej?",
  "Jakie są przesłanki odpowiedzialności za zwierzę?",
  "Czy pracodawca może zwolnić pracownika na zwolnieniu lekarskim?",
  "Ile wynosi okres wypowiedzenia umowy o pracę?",
];

const results = {
  total: 0,
  success: 0,
  failed: 0,
  failures: [],
  times: [],
};

async function sendRequest(index) {
  const question = QUESTIONS[index % QUESTIONS.length];
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ question }),
    });

    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      return {
        index,
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${errorText}`,
        elapsed,
      };
    }

    const data = await response.json();
    
    return {
      index,
      success: true,
      status: response.status,
      elapsed,
      textLength: data.text?.length || 0,
      sourcesCount: data.sources?.length || 0,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    return {
      index,
      success: false,
      status: 0,
      error: error.message,
      elapsed,
    };
  }
}

async function runTests(count, concurrency) {
  console.log('🧪 ZapytajKodeks API Tester');
  console.log('═'.repeat(50));
  console.log(`📊 Requests: ${count}`);
  console.log(`⚡ Concurrency: ${concurrency}`);
  console.log(`🔗 Endpoint: ${API_URL}`);
  console.log('═'.repeat(50));
  console.log('');

  const startTime = Date.now();
  let completed = 0;

  // Process in batches
  for (let i = 0; i < count; i += concurrency) {
    const batch = [];
    const batchSize = Math.min(concurrency, count - i);
    
    for (let j = 0; j < batchSize; j++) {
      batch.push(sendRequest(i + j));
    }

    const batchResults = await Promise.all(batch);
    
    for (const result of batchResults) {
      results.total++;
      results.times.push(result.elapsed);
      
      if (result.success) {
        results.success++;
        process.stdout.write(`\r✅ ${results.success}/${results.total} passed | ❌ ${results.failed} failed`);
      } else {
        results.failed++;
        results.failures.push(result);
        process.stdout.write(`\r✅ ${results.success}/${results.total} passed | ❌ ${results.failed} failed`);
      }
    }
  }

  const totalTime = Date.now() - startTime;
  
  // Print results
  console.log('\n');
  console.log('═'.repeat(50));
  console.log('📋 RESULTS');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${results.success}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`⏱️  Total time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`📈 Avg response time: ${(results.times.reduce((a, b) => a + b, 0) / results.times.length / 1000).toFixed(2)}s`);
  console.log(`🚀 Min response time: ${(Math.min(...results.times) / 1000).toFixed(2)}s`);
  console.log(`🐢 Max response time: ${(Math.max(...results.times) / 1000).toFixed(2)}s`);
  
  if (results.failures.length > 0) {
    console.log('');
    console.log('═'.repeat(50));
    console.log('❌ FAILURES');
    console.log('═'.repeat(50));
    
    for (const failure of results.failures) {
      console.log(`\n  Request #${failure.index + 1}:`);
      console.log(`    Status: ${failure.status}`);
      console.log(`    Error: ${failure.error}`);
      console.log(`    Time: ${(failure.elapsed / 1000).toFixed(2)}s`);
    }
  }
  
  console.log('');
}

// Parse arguments
const count = parseInt(process.argv[2]) || 100;
const concurrency = parseInt(process.argv[3]) || 5;

runTests(count, concurrency);
