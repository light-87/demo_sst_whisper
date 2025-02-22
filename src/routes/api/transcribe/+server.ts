// src/routes/api/transcribe/+server.ts

import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { promises as fsPromises } from 'fs';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { RequestEvent } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

if (!ffmpegPath) {
    throw new Error('ffmpeg path not found');
}
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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
  
  // Create temporary file paths for the input and converted audio files
  const inputFilePath = path.join(tmpdir(), `input_audio_${Date.now()}.wav`);
  const convertedFilePath = path.join(tmpdir(), `converted_audio_${Date.now()}.wav`);
  
  try {
    // Write the original file to the temporary input file path
    await fsPromises.writeFile(inputFilePath, buffer);
    
    // Convert the audio to mono, 16kHz, PCM_S16LE WAV format using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFilePath)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('end', resolve)
        .on('error', reject)
        .save(convertedFilePath);
    });
    
    // Call the OpenAI Whisper API using the converted file stream
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(convertedFilePath),
      model: 'whisper-1',
      response_format: 'text'
    });
    
    // Return the transcription text as a JSON response
    return json({ transcription });
  } catch (error) {
    console.error('Transcription failed:', error);
    return json({ error: 'Transcription failed' }, { status: 500 });
  } finally {
    // Clean up temporary files
    try {
      await fsPromises.unlink(inputFilePath);
      await fsPromises.unlink(convertedFilePath);
    } catch (cleanupError) {
      console.error('Failed to delete temporary files:', cleanupError);
    }
  }
}
