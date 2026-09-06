import React, { useState } from 'react';

export default function DocumentUpload({ apiBaseUrl, onTextExtracted }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = async (event) => {
    const document = event.target.files?.[0];
    if (!document) return;
    setBusy(true);
    setMessage('Reading document...');
    const formData = new FormData();
    formData.append('document', document);
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/extract`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Document extraction failed.');
      onTextExtracted(data.text);
      setMessage(`${document.name} text is ready for review.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return <div className="document-upload">
    <label htmlFor="document-upload-input">Upload a PDF or image receipt</label>
    <input id="document-upload-input" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy} onChange={handleChange} />
    {message && <span role="status">{message}</span>}
  </div>;
}
