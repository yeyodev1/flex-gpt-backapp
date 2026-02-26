
import dotenv from 'dotenv';
import { ClaudeService } from './src/services/claude.service.ts';

dotenv.config();

async function testClaude() {
  console.log('Testing Claude API...');
  const service = new ClaudeService();
  try {
    const stream = service.streamChat([{ role: 'user', content: 'Hi' }]);
    const first = await stream.next();
    console.log('Claude Response:', first.value);
    if (!first.value) {
      console.error('Claude returned empty first chunk');
    }
  } catch (error) {
    console.error('Claude Test Failed:', error);
  }
}

testClaude();
