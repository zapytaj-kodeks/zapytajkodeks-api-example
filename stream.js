#!/usr/bin/env node

/**
 * Simple Node.js script to consume streaming NDJSON response
 * Usage: node stream.js "Your question here"
 */

import 'dotenv/config';

const API_URL = "https://api.zapytajkodeks.pl/v1/analysis/stream";
const API_KEY = process.env.ZAPYTAJKODEKS_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: ZAPYTAJKODEKS_API_KEY is not set in .env file');
  process.exit(1);
}

// Animated spinner for visual feedback
const spinner = {
  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  index: 0,
  interval: null,
  
  start() {
    if (this.interval) return;
    process.stdout.write(this.frames[this.index]);
    this.interval = setInterval(() => {
      process.stdout.write(`\b${this.frames[this.index]}`);
      this.index = (this.index + 1) % this.frames.length;
    }, 80);
  },
  
  pause() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\b \b');
    }
  },
  
  stop() {
    this.pause();
  }
};

async function streamAnalysis(question) {
  console.log(`📝 Question: ${question}\n`);
  console.log('─'.repeat(50));
  
  process.stdout.write('Connecting... ');
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // Clear "Connecting..." and start streaming
  process.stdout.write('\r' + ' '.repeat(20) + '\r');
  
  spinner.start();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullText = '';
  let allSources = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const event = JSON.parse(line);

        switch (event.type) {
          case 'text-delta':
            spinner.pause();
            process.stdout.write(event.textDelta);
            fullText += event.textDelta;
            spinner.start();
            break;

          case 'sources':
            spinner.pause();
            // Print sources when they arrive
            console.log('\n');
            console.log('─'.repeat(50));
            console.log(`📚 Sources from: ${event.toolName}`);
            console.log('─'.repeat(50));
            
            for (const source of event.sources) {
              console.log(`  • Type: ${source.type}`);
              console.log(`    ID: ${source.id}`);
              if (source.fields) {
                console.log(`    Fields: ${JSON.stringify(source.fields, null, 2).split('\n').join('\n    ')}`);
              }
            }
            
            allSources.push(...event.sources);
            console.log('─'.repeat(50));
            spinner.start();
            break;

          case 'finish':
            spinner.stop();
            // Add sources from finish event to allSources
            if (event.sources && event.sources.length > 0) {
              allSources.push(...event.sources);
            }

            console.log('\n');
            console.log('═'.repeat(50));
            console.log('✅ Stream finished!');
            console.log('═'.repeat(50));
            console.log(`📊 Finish reason: ${event.finishReason}`);
            
            // Print sources from finish event
            console.log(`\n📚 Sources (${allSources.length}):`);
            for (const source of allSources) {
              console.log(`  • Type: ${source.type}, ID: ${source.id}`);
              if (source.fields) {
                console.log(`    ${JSON.stringify(source.fields)}`);
              }
            }
            break;

          default:
            spinner.pause();
            console.log(`\n⚠️ Unknown event type: ${event.type}`);
            spinner.start();
        }
      } catch (parseError) {
        // Ignore non-JSON lines
      }
    }
  }

  return { text: fullText, sources: allSources };
}

// Main execution
const question = process.argv[2] || "Kiedy mogę poprosić sąd o warunkowe umorzenie sprawy karnej";

streamAnalysis(question)
  .then(({ text, sources }) => {
    console.log('\n');
    console.log('═'.repeat(50));
    console.log('📋 FINAL SUMMARY');
    console.log('═'.repeat(50));
    console.log(`\nFull response length: ${text.length} characters`);
    console.log(`Total sources: ${sources.length}`);
  })
  .catch((error) => {
    spinner.stop();
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

