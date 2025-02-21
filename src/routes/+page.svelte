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
	  "Passage 1: I think people should not spend too much time on their hobby because beside because they has they they have umm they they has and their work their work and on their studying they have to do.",
	  "Passage 2: like is there some other people like some of the heroes players like if we can talk about sachin tendulkar, he is really famous because he's really good player as well he's well known in world all of the worlds like we can say about some singers and players and actors they are famous as well",
	  "Passage 3: yeah it's an interesting question this one but yeah i think i think usually the people rad about the that the they are interesting about either the the the uh the person who's famous or they then uh the author they they know so yeah yeah i think the they will read it only which is enjoyable to them. ",
	  "Passage 4: Those people in the future I think because of because we have high level of education we are well educated so I think all of want to have a beautiful world in the future, so maybe in the future  we will admire those people who chan change our world who can make our world better and more beautiful.",
	  "Passage 5: I think umm ahh maybe the whoze they working in the media and ur or who's they usually are presented in the media maybe the polititians maybe the uhh scientists and but i think the more known or more famous for the especially the young people are sport stars and movie stars.",
	  "Passage 6: You know those actors especially the movie actors and the sports actor uh sorry the movie actors and the sports stars  they are very famous now in china because uh they can be seen by the people every day during the movie on the advertisements they can be seen all times so they are very famous and those people who are very rich",
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
  