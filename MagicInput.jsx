import React, { useEffect, useState } from 'react';

export const MagicInput = ({ schemaId, apiBaseUrl, onExtractionComplete, prefillText }) => {
  const [narrative, setNarrative] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );

  useEffect(() => {
    if (prefillText) setNarrative(prefillText.slice(0, 800));
  }, [prefillText]);

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

      onExtractionComplete(data.extractedData, data.confidence || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
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
        <button type="button" className={`voice-button ${isListening ? 'voice-button--active' : ''}`} onClick={toggleListening}>
          {isListening ? 'Stop listening' : 'Use microphone'}
        </button>
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