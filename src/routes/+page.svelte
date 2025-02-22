<script lang="ts">
	import { onMount } from 'svelte';
  
	// State variables
	let isRecording = false;
	let transcription = '';
	let errorMsg = '';
	let sampleScript = '';
  
	// Parameter options
	let selectedRecordingMethod = 'media'; // "media" or "webaudio"
	let selectedSampleRate = '16000'; // in Hz, e.g., "16000", "44100", "48000"
	let selectedChannels = '1'; // "1" for mono, "2" for stereo
	let selectedMimeType = 'audio/webm'; // e.g., "audio/webm", "audio/wav", "audio/mp4"
	let bufferSize: number = 1024; // Buffer size in samples for WebAudio
  
	// MediaRecorder variables
	let mediaRecorder: MediaRecorder;
	let mediaChunks: Blob[] = [];
  
	// WebAudio Recorder variables
	let audioContext: AudioContext;
	let scriptProcessor: ScriptProcessorNode;
	let source: MediaStreamAudioSourceNode;
	let webAudioChunks: Float32Array[] = [];
	let stream: MediaStream;
  
	// Array of 10 sample paragraphs.
	const sampleScripts = [
	  "Passage 1: I think people should not spend too much time on their hobby because beside because they has they they have umm they they has and their work their work and on their studying they have to do.",
	  "Passage 2: like is there some other people like some of the heroes players like if we can talk about sachin tendulkar, he is really famous because he's really good player as well he's well known in world all of the worlds like we can say about some singers and players and actors they are famous as well",
	  "Passage 3: yeah it's an interesting question this one but yeah i think i think usually the people rad about the that the they are interesting about either the the the uh the person who's famous or they then uh the author they they know so yeah yeah i think the they will read it only which is enjoyable to them. ",
	  "Passage 4: Those people in the future I think because of because we have high level of education we are well educated so I think all of want to have a beautiful world in the future, so maybe in the future  we will admire those people who chan change our world who can make our world better and more beautiful.",
	  "Passage 5: I think umm ahh maybe the whoze they working in the media and ur or who's they usually are presented in the media maybe the polititians maybe the uhh scientists and but i think the more known or more famous for the especially the young people are sport stars and movie stars.",
	  "Passage 6: You know those actors especially the movie actors and the sports actor uh sorry the movie actors and the sports stars  they are very famous now in china because uh they can be seen by the people every day during the movie on the advertisements they can be seen all times so they are very famous and those people who are very rich",
	];
  
	onMount(() => {
	  sampleScript = sampleScripts[Math.floor(Math.random() * sampleScripts.length)];
	});
  
	// --- MediaRecorder Methods ---
	async function startMediaRecorder() {
	  try {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const options = { mimeType: selectedMimeType };
		mediaRecorder = new MediaRecorder(stream, options);
		mediaChunks = [];
		mediaRecorder.ondataavailable = (event) => {
		  if (event.data.size > 0) {
			mediaChunks.push(event.data);
		  }
		};
		mediaRecorder.start();
		isRecording = true;
		transcription = '';
		errorMsg = '';
	  } catch (err) {
		errorMsg = 'Failed to access microphone: ' + err;
	  }
	}
  
	async function stopMediaRecorder() {
	  return new Promise<void>((resolve, reject) => {
		if (!mediaRecorder) {
		  reject('No recorder found');
		}
		mediaRecorder.onstop = async () => {
		  isRecording = false;
		  const audioBlob = new Blob(mediaChunks, { type: selectedMimeType });
		  const formData = new FormData();
		  formData.append('file', audioBlob, 'audio.wav');
		  formData.append('sampleRate', selectedSampleRate);
		  formData.append('channels', selectedChannels);
		  formData.append('mimeType', selectedMimeType);
		  try {
			transcription = 'Transcribing...';
			const res = await fetch('/api/transcribe', {
			  method: 'POST',
			  body: formData
			});
			const data = await res.json();
			transcription = data.transcription || 'No transcription received.';
		  } catch (error) {
			errorMsg = 'Error during transcription: ' + error;
		  }
		  resolve();
		};
		mediaRecorder.stop();
	  });
	}
  
	// --- WebAudio Recorder Methods ---
	async function startWebAudioRecorder() {
	  try {
		stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		audioContext = new AudioContext();
		source = audioContext.createMediaStreamSource(stream);
		// Create a ScriptProcessor with the selected buffer size (and 1 input & output channel)
		scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
		webAudioChunks = [];
		scriptProcessor.onaudioprocess = (event) => {
		  const channelData = event.inputBuffer.getChannelData(0);
		  // Clone the data to a new Float32Array
		  webAudioChunks.push(new Float32Array(channelData));
		};
		source.connect(scriptProcessor);
		scriptProcessor.connect(audioContext.destination);
		isRecording = true;
		transcription = '';
		errorMsg = '';
	  } catch (err) {
		errorMsg = 'Failed to access microphone (WebAudio): ' + err;
	  }
	}
  
	async function stopWebAudioRecorder() {
	  // Stop processing
	  scriptProcessor.disconnect();
	  source.disconnect();
	  stream.getTracks().forEach((track) => track.stop());
	  isRecording = false;
  
	  // Combine all Float32Array chunks into one
	  let totalLength = webAudioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
	  let combined = new Float32Array(totalLength);
	  let offset = 0;
	  for (const chunk of webAudioChunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	  }
  
	  // Convert Float32Array (range [-1, 1]) to 16-bit PCM (Int16Array)
	  const pcmBuffer = new Int16Array(combined.length);
	  for (let i = 0; i < combined.length; i++) {
		let s = Math.max(-1, Math.min(1, combined[i]));
		pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
	  }
  
	  // Create a WAV file Blob from the PCM data
	  const wavBlob = createWavBlob(pcmBuffer, audioContext.sampleRate, 1);
  
	  const formData = new FormData();
	  formData.append('file', wavBlob, 'audio.wav');
	  formData.append('sampleRate', selectedSampleRate);
	  formData.append('channels', selectedChannels);
	  formData.append('mimeType', selectedMimeType);
  
	  try {
		transcription = 'Transcribing...';
		const res = await fetch('/api/transcribe', {
		  method: 'POST',
		  body: formData
		});
		const data = await res.json();
		transcription = data.transcription || 'No transcription received.';
	  } catch (error) {
		errorMsg = 'Error during transcription: ' + error;
	  }
	}
  
	// Utility function: Create a WAV Blob from PCM data
	function createWavBlob(samples: Int16Array, sampleRate: number, numChannels: number) {
	  const buffer = new ArrayBuffer(44 + samples.length * 2);
	  const view = new DataView(buffer);
	  function writeString(view: DataView, offset: number, str: string) {
		for (let i = 0; i < str.length; i++) {
		  view.setUint8(offset + i, str.charCodeAt(i));
		}
	  }
	  writeString(view, 0, 'RIFF');
	  view.setUint32(4, 36 + samples.length * 2, true);
	  writeString(view, 8, 'WAVE');
	  writeString(view, 12, 'fmt ');
	  view.setUint32(16, 16, true);
	  view.setUint16(20, 1, true);
	  view.setUint16(22, numChannels, true);
	  view.setUint32(24, sampleRate, true);
	  view.setUint32(28, sampleRate * numChannels * 2, true);
	  view.setUint16(32, numChannels * 2, true);
	  view.setUint16(34, 16, true);
	  writeString(view, 36, 'data');
	  view.setUint32(40, samples.length * 2, true);
	  let offset = 44;
	  for (let i = 0; i < samples.length; i++, offset += 2) {
		view.setInt16(offset, samples[i], true);
	  }
	  return new Blob([view], { type: 'audio/wav' });
	}
  
	function toggleRecording() {
	  if (!isRecording) {
		if (selectedRecordingMethod === 'media') {
		  startMediaRecorder();
		} else {
		  startWebAudioRecorder();
		}
	  } else {
		if (selectedRecordingMethod === 'media') {
		  stopMediaRecorder();
		} else {
		  stopWebAudioRecorder();
		}
	  }
	}
  </script>
  
  <style>
	.container {
	  max-width: 600px;
	  margin: 2rem auto;
	  padding: 1rem;
	  font-family: Arial, sans-serif;
	}
	.parameters,
	.script-window,
	.transcription-display {
	  border: 1px solid #ccc;
	  padding: 1rem;
	  margin-bottom: 1rem;
	  border-radius: 4px;
	  background-color: #f9f9f9;
	}
	label {
	  display: block;
	  margin-bottom: 0.5rem;
	}
	select,
	input[type="number"] {
	  margin-left: 0.5rem;
	}
	button {
	  padding: 0.75rem 1.5rem;
	  font-size: 1rem;
	  cursor: pointer;
	  background-color: #0070f3;
	  color: white;
	  border: none;
	  border-radius: 4px;
	}
	button:hover {
	  background-color: #005bb5;
	}
	.error {
	  color: red;
	}
  </style>
  
  <div class="container">
	<h1>SST Test App with Advanced Parameter Options</h1>
  
	<!-- Audio Parameter Options -->
	<div class="parameters">
	  <h3>Audio Parameters</h3>
	  <label>
		Recording Method:
		<select bind:value={selectedRecordingMethod}>
		  <option value="media">MediaRecorder</option>
		  <option value="webaudio">WebAudio Recorder</option>
		</select>
	  </label>
	  <label>
		Sample Rate:
		<select bind:value={selectedSampleRate}>
		  <option value="16000">16 kHz</option>
		  <option value="44100">44.1 kHz</option>
		  <option value="48000">48 kHz</option>
		</select>
	  </label>
	  <label>
		Channels:
		<select bind:value={selectedChannels}>
		  <option value="1">Mono</option>
		  <option value="2">Stereo</option>
		</select>
	  </label>
	  <label>
		MIME Type:
		<select bind:value={selectedMimeType}>
		  <option value="audio/webm">audio/webm</option>
		  <option value="audio/wav">audio/wav</option>
		  <option value="audio/mp4">audio/mp4</option>
		</select>
	  </label>
	  <label>
		Buffer Size (in samples):
		<input type="number" bind:value={bufferSize} min="256" max="8192" step="256" />
	  </label>
	</div>
  
	<!-- Display the sample script -->
	<div class="script-window">
	  <h3>Sample Script</h3>
	  <p>{sampleScript}</p>
	</div>
  
	<!-- Record Start/Stop Button -->
	<button on:click={toggleRecording}>
	  {#if isRecording}
		Stop Recording
	  {:else}
		Start Recording
	  {/if}
	</button>
  
	{#if errorMsg}
	  <p class="error">{errorMsg}</p>
	{/if}
  
	<!-- Transcription Display Area -->
	<div class="transcription-display">
	  <h3>Transcription</h3>
	  <p>{transcription}</p>
	</div>
  </div>
  