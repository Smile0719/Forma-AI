import React, { useEffect, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const emptyField = () => ({
  name: `field_${Date.now()}`,
  label: 'New question',
  type: 'text',
  placeholder: '',
  options: [],
  validation: { required: false, pattern: '' },
  showIf: null
});

function SortableField({ field, fields, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.name });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const update = (patch) => onChange({ ...field, ...patch });
  const validation = field.validation || {};
  const updateValidation = (patch) => update({ validation: { ...validation, ...patch } });
  const updateCondition = (patch) => update({ showIf: { ...(field.showIf || {}), ...patch } });

  return (
    <article ref={setNodeRef} style={style} className="builder-field">
      <div className="builder-field-header">
        <button type="button" className="drag-handle" aria-label={`Reorder ${field.label}`} {...attributes} {...listeners}>::</button>
        <strong>{field.label || 'Untitled question'}</strong>
        <button type="button" className="remove-field" onClick={() => onRemove(field.name)}>Remove</button>
      </div>
      <div className="builder-grid">
        <label>Field key<input value={field.name} onChange={(event) => update({ name: event.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} /></label>
        <label>Label<input value={field.label} onChange={(event) => update({ label: event.target.value })} /></label>
        <label>Type<select value={field.type} onChange={(event) => update({ type: event.target.value })}>
          <option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="checkbox">Checkbox</option>
        </select></label>
        {field.type !== 'checkbox' && <label>Placeholder<input value={field.placeholder || ''} onChange={(event) => update({ placeholder: event.target.value })} /></label>}
      </div>
      {field.type === 'select' && <label className="builder-wide">Options (label:value, one per line)
        <textarea value={(field.options || []).map((option) => `${option.label}:${option.value}`).join('\n')} onChange={(event) => update({ options: event.target.value.split('\n').filter(Boolean).map((line) => { const [label, value = label] = line.split(':'); return { label: label.trim(), value: value.trim() }; }) })} />
      </label>}
      <div className="builder-grid builder-settings">
        <label className="builder-check"><input type="checkbox" checked={Boolean(validation.required)} onChange={(event) => updateValidation({ required: event.target.checked })} /> Required</label>
        <label>Validation regex<input placeholder="^[A-Z0-9-]+$" value={validation.pattern || ''} onChange={(event) => updateValidation({ pattern: event.target.value })} /></label>
        <label>Show when<select value={field.showIf?.field || ''} onChange={(event) => event.target.value ? update({ showIf: { field: event.target.value, equals: field.showIf?.equals || '' } }) : update({ showIf: null })}>
          <option value="">Always visible</option>
          {fields.filter((candidate) => candidate.name !== field.name).map((candidate) => <option key={candidate.name} value={candidate.name}>{candidate.label}</option>)}
        </select></label>
        {field.showIf && <label>Equals<input value={String(field.showIf.equals ?? '')} onChange={(event) => updateCondition({ equals: event.target.value })} /></label>}
      </div>
    </article>
  );
}

export default function AdminDashboard({ schema, apiBaseUrl, onSaved, onClose }) {
  const [draft, setDraft] = useState({ title: '', description: '', fields: [] });
  const [revisions, setRevisions] = useState([]);
  const [status, setStatus] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!schema) return;
    setDraft({ title: schema.title, description: schema.description || '', fields: schema.fields || [] });
    fetch(`${apiBaseUrl}/api/schemas/${schema._id}/revisions`).then((response) => response.json()).then((data) => setRevisions(data.revisions || [])).catch(() => {});
  }, [schema, apiBaseUrl]);

  const updateField = (nextField) => setDraft((current) => ({ ...current, fields: current.fields.map((field) => field.name === nextField.name ? nextField : field) }));
  const removeField = (name) => setDraft((current) => ({ ...current, fields: current.fields.filter((field) => field.name !== name) }));
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setDraft((current) => {
      const oldIndex = current.fields.findIndex((field) => field.name === active.id);
      const newIndex = current.fields.findIndex((field) => field.name === over.id);
      return { ...current, fields: arrayMove(current.fields, oldIndex, newIndex) };
    });
  };
  const save = async () => {
    setStatus('Saving...');
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, revisionLabel: 'Admin builder update' }) });
    if (!response.ok) { setStatus('Could not save schema.'); return; }
    const saved = await response.json();
    setStatus(`Saved version ${saved.version}.`);
    onSaved(saved);
    setRevisions(saved.revisions || revisions);
  };
  const restore = (revision) => setDraft(revision.snapshot);

  return <main className="admin-dashboard">
    <div className="admin-header"><div><p className="eyebrow">Administrator mode</p><h1>Form Builder</h1><p>Arrange questions, validation, and branching without editing JSON.</p></div><button type="button" className="text-button" onClick={onClose}>Back to form</button></div>
    <section className="builder-panel">
      <label>Form title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Form description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={draft.fields.map((field) => field.name)} strategy={verticalListSortingStrategy}>
          {draft.fields.map((field) => <SortableField key={field.name} field={field} fields={draft.fields} onChange={updateField} onRemove={removeField} />)}
        </SortableContext>
      </DndContext>
      <div className="builder-actions"><button type="button" className="secondary-button" onClick={() => setDraft({ ...draft, fields: [...draft.fields, emptyField()] })}>+ Add field</button><button type="button" className="magic-button" onClick={save}>Save new version</button></div>
      {status && <p className="draft-status" role="status">{status}</p>}
    </section>
    <section className="revision-panel"><div><p className="eyebrow">Revision history</p><h2>Restore an earlier schema</h2></div>{revisions.length === 0 ? <p>No saved revisions yet.</p> : revisions.slice().reverse().map((revision) => <button type="button" className="revision-row" key={`${revision.version}-${revision.savedAt}`} onClick={() => restore(revision)}><strong>Version {revision.version}</strong><span>{revision.label} · {new Date(revision.savedAt).toLocaleString()}</span></button>)}</section>
  </main>;
}
