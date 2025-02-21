// src/routes/api/transcribe/+server.js

import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { RequestEvent } from '@sveltejs/kit';

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST({ request }: RequestEvent) {
  // Parse form data from the request
  const formData = await request.formData();
  const file = formData.get('file') as Blob;
  if (!file) {
    return json({ error: 'No file provided' }, { status: 400 });
  }
  
  // Convert the incoming file (which is a Blob) to a Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Create a temporary file path in the system's temp directory
  const tempFilePath = path.join(tmpdir(), `audio_${Date.now()}.wav`);
  
  try {
    // Write the file buffer to the temporary file path
    await fsPromises.writeFile(tempFilePath, buffer);
    
    // Call the OpenAI Whisper API using the temporary file stream
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      response_format: 'text'
    });
    
    // Return the transcription text as a JSON response
    return json({ transcription });
  } catch (error) {
    console.error('Transcription failed:', error);
    return json({ error: 'Transcription failed' }, { status: 500 });
  } finally {
    // Clean up the temporary file after processing
    try {
      await fsPromises.unlink(tempFilePath);
    } catch (cleanupError) {
      console.error('Failed to delete temporary file:', cleanupError);
    }
  }
}
