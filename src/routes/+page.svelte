<script lang="ts">
	import { onMount } from 'svelte';
  
	let isRecording = false;
	let recorder: MediaRecorder;
	let audioChunks: Blob[] = [];
	let transcription = '';
	let errorMsg = '';
	let sampleScript = '';
  
	// Array of 10 sample paragraphs.
	const sampleScripts = [
	  "This is paragraph 1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
	  "This is paragraph 2. Vivamus lacinia odio vitae vestibulum vestibulum.",
	  "This is paragraph 3. Cras vehicula, mi quis hendrerit fermentum, sapien ligula varius orci, a pretium purus nunc eu elit.",
	  "This is paragraph 4. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh.",
	  "This is paragraph 5. Nulla vitae elit libero, a pharetra augue.",
	  "This is paragraph 6. Donec ullamcorper nulla non metus auctor fringilla.",
	  "This is paragraph 7. Integer posuere erat a ante venenatis dapibus posuere velit aliquet.",
	  "This is paragraph 8. Sed posuere consectetur est at lobortis.",
	  "This is paragraph 9. Maecenas sed diam eget risus varius blandit sit amet non magna.",
	  "This is paragraph 10. Aenean lacinia bibendum nulla sed consectetur."
	];
  
	onMount(() => {
	  // Choose a random script on mount
	  sampleScript = sampleScripts[Math.floor(Math.random() * sampleScripts.length)];
	});
  
	async function toggleRecording() {
	  if (!isRecording) {
		// Start recording
		try {
		  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		  recorder = new MediaRecorder(stream);
		  audioChunks = [];
  
		  recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
			  audioChunks.push(event.data);
			}
		  };
  
		  recorder.start();
		  isRecording = true;
		  transcription = ''; // Clear previous transcription
		  errorMsg = '';
		} catch (err) {
		  errorMsg = 'Failed to access microphone: ' + err;
		}
	  } else {
		// Stop recording
		recorder.stop();
		isRecording = false;
		recorder.onstop = async () => {
		  // Combine the audio chunks into a single Blob (assuming WAV format)
		  const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
		  // Prepare form data for the API call
		  const formData = new FormData();
		  formData.append('file', audioBlob, 'audio.wav');
  
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
		};
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
	.script-window,
	.transcription-display {
	  border: 1px solid #ccc;
	  padding: 1rem;
	  margin-bottom: 1rem;
	  border-radius: 4px;
	  background-color: #f9f9f9;
	  min-height: 100px;
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
	<h1>SST Test App</h1>
  
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
  