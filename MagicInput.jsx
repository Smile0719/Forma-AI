import React, { useRef, useState } from 'react';

export const MagicInput = ({ schemaId, apiBaseUrl, authFetch, onProvider, onExtractionComplete }) => {
  const [narrative, setNarrative] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionMode, setTranscriptionMode] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [speechSupported] = useState(
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  const toggleListening = () => {
    if (!speechSupported) {
      setError('Voice input is not supported in this browser. You can still type your story.');
      return;
    }

    if (isListening) {
      window.__formaRecognition?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'auto' ? navigator.language : language;
    window.__formaRecognition = recognition;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setNarrative(transcript.slice(0, 800));
    };
    recognition.onerror = () => {
      setError('Voice capture stopped. Please check microphone access and try again.');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setError('');
    setIsListening(true);
  };

  // Whisper-based recording: capture audio, transcribe server-side with OpenAI Whisper.
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1000) return setError('No speech was captured. Try again.');
        setIsProcessing(true);
        setError('');
        try {
          const body = new FormData();
          body.append('audio', blob, 'narration.webm');
          const response = await (authFetch || fetch)(`${apiBaseUrl}/api/ai/transcribe`, { method: 'POST', body });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) throw new Error(data.error || 'Transcription failed.');
          setTranscriptionMode('whisper');
          setNarrative((current) => `${current} ${data.text}`.trim().slice(0, 800));
        } catch (err) {
          setError(err.message);
        } finally {
          setIsProcessing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setTranscriptionMode('whisper');
      setError('');
    } catch (_err) {
      setError('Microphone access was denied. You can still type your story.');
    }
  };

  const handleExtract = async () => {
    if (!narrative.trim()) return;

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, narrative })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process narrative.');
      }

      onProvider?.(data.provider || '');
      onExtractionComplete(data.extractedData, data.confidence || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    setDocumentName(file.name);
    try {
      const body = new FormData();
      body.append('schemaId', schemaId);
      body.append('document', file);
      const response = await fetch(`${apiBaseUrl}/api/ai/upload`, { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Document parsing failed.');
      onProvider?.(data.provider || '');
      onExtractionComplete(data.extractedData, data.confidence || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <section className="magic-panel">
      <div className="magic-heading">
        <span className="magic-mark" aria-hidden="true">✦</span>
        <div>
          <p className="eyebrow">Fast track</p>
          <h3>AI Magic Assist</h3>
        </div>
      </div>
      <p className="magic-copy">
        Type or speak your story in any supported language to automatically pre-fill form fields.
      </p>

      <div className="magic-controls">
        <label htmlFor="narrative-language">Story language</label>
        <select
          id="narrative-language"
          value={language}
          disabled={isProcessing || isListening}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="auto">Auto-detect</option>
          <option value="en-US">English</option>
          <option value="es-ES">Español</option>
          <option value="hi-IN">हिन्दी</option>
          <option value="de-DE">Deutsch</option>
          <option value="fr-FR">Français</option>
        </select>
        <button type="button" className={`voice-button ${isListening ? 'voice-button--active' : ''}`} onClick={toggleListening} disabled={isRecording}>
          {isListening ? 'Stop live mic' : 'Live mic (browser)'}
        </button>
        <button type="button" className={`voice-button ${isRecording ? 'voice-button--active' : ''}`} onClick={toggleRecording} disabled={isListening || isProcessing}>
          {isRecording ? 'Stop & transcribe (Whisper)' : 'Record for Whisper AI'}
        </button>
        {transcriptionMode && <span className="provider-badge">Speech: {transcriptionMode}</span>}
      </div>
      <textarea
        id="magic-narrative"
        rows={4}
        value={narrative}
        disabled={isProcessing}
        onChange={(e) => setNarrative(e.target.value)}
        placeholder="e.g., I hit a deer on I-95 yesterday in my Honda, and the windshield shattered."
        className="magic-textarea"
        aria-describedby="magic-help"
        maxLength={800}
      />
      <div className="magic-meta">
        <span id="magic-help">Describe the incident in your own words.</span>
        <span>{narrative.length}/800</span>
      </div>

      <button
        type="button"
        className="magic-button"
        onClick={handleExtract}
        disabled={isProcessing || !narrative.trim()}
      >
        {isProcessing ? 'AI Processing...' : 'Auto-Fill Form'}
      </button>

      <label className="document-upload">
        <span>{isUploading ? 'Reading document...' : 'Upload PDF or receipt image'}</span>
        <input type="file" accept="application/pdf,image/*" disabled={isProcessing || isUploading} onChange={handleDocumentUpload} />
      </label>
      {documentName && !isUploading && <p className="magic-meta">Parsed: {documentName}</p>}

      {error && <p className="magic-error" role="alert">{error}</p>}

      {isProcessing && (
        <div className="loading-skeleton" aria-label="Processing">
          <div />
          <div />
        </div>
      )}
    </section>
  );
};