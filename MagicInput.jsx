import React, { useState } from 'react';

export const MagicInput = ({ schemaId, apiBaseUrl, onExtractionComplete }) => {
  const [narrative, setNarrative] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

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

      // Pass extracted JSON values up to parent component to hydrate form state
      onExtractionComplete(data.extractedData);
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
        Paste or type a summary of your situation below to automatically pre-fill form fields.
      </p>

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

      {error && <p className="magic-error">{error}</p>}

      {/* Loading Skeleton UI */}
      {isProcessing && (
        <div className="loading-skeleton" aria-label="Processing">
          <div />
          <div />
        </div>
      )}
    </section>
  );
};