import React, { useState } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const emptyField = (index) => ({
  name: `field${index}`,
  label: 'New field',
  type: 'text',
  placeholder: '',
  options: [],
  validation: { required: false, pattern: '', minLength: undefined, maxLength: undefined },
  showIf: undefined
});

const SortableField = ({ field, index, fields, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.name });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const update = (patch) => onChange(index, { ...field, ...patch });
  const updateValidation = (patch) => update({ validation: { ...field.validation, ...patch } });

  return (
    <article ref={setNodeRef} style={style} className="builder-field" {...attributes}>
      <button type="button" className="drag-handle" {...listeners} aria-label={`Reorder ${field.label}`}>
        ::
      </button>
      <div className="builder-field-grid">
        <label>Field key<input value={field.name} onChange={(event) => update({ name: event.target.value.replace(/\s+/g, '') })} /></label>
        <label>Label<input value={field.label} onChange={(event) => update({ label: event.target.value })} /></label>
        <label>Type<select value={field.type} onChange={(event) => update({ type: event.target.value })}>
          <option value="text">Text</option><option value="number">Number</option><option value="select">Select</option><option value="checkbox">Checkbox</option>
        </select></label>
        {field.type !== 'checkbox' && <label>Placeholder<input value={field.placeholder || ''} onChange={(event) => update({ placeholder: event.target.value })} /></label>}
        {field.type === 'select' && <label className="builder-wide">Options (label:value, one per line)<textarea value={(field.options || []).map((option) => `${option.label}:${option.value}`).join('\n')} onChange={(event) => update({ options: event.target.value.split('\n').filter(Boolean).map((line) => { const [label, value = label] = line.split(':'); return { label: label.trim(), value: value.trim() }; }) })} /></label>}
        <label className="builder-check"><input type="checkbox" checked={Boolean(field.validation?.required)} onChange={(event) => updateValidation({ required: event.target.checked })} /> Required</label>
        {field.type !== 'checkbox' && <label>Validation regex<input placeholder="^[A-Z0-9-]+$" value={field.validation?.pattern || ''} onChange={(event) => updateValidation({ pattern: event.target.value })} /></label>}
        <label>Show when<select value={field.showIf?.field || ''} onChange={(event) => update({ showIf: event.target.value ? { field: event.target.value, equals: field.showIf?.equals ?? '' } : undefined })}>
          <option value="">Always visible</option>{fields.filter((item) => item.name !== field.name).map((item) => <option key={item.name} value={item.name}>{item.label}</option>)}
        </select></label>
        {field.showIf && <label>Equals<input value={String(field.showIf.equals)} onChange={(event) => update({ showIf: { ...field.showIf, equals: event.target.value } })} /></label>}
      </div>
      <button type="button" className="builder-remove" onClick={() => onRemove(index)}>Remove</button>
    </article>
  );
};

export default function AdminDashboard({ schema, apiBaseUrl, onClose, onSaved }) {
  const [title, setTitle] = useState(schema.title);
  const [description, setDescription] = useState(schema.description || '');
  const [fields, setFields] = useState(schema.fields.map((field) => ({ ...field, validation: { ...field.validation } })));
  const [revisions, setRevisions] = useState([]);
  const [message, setMessage] = useState('');
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const updateField = (index, field) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? field : item));
  const removeField = (index) => setFields((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setFields((current) => arrayMove(current, current.findIndex((field) => field.name === active.id), current.findIndex((field) => field.name === over.id)));
  };
  const save = async () => {
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, fields }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || 'Could not save form.');
    setMessage(`Saved version ${data.version}.`);
    onSaved(data);
  };
  const loadRevisions = async () => {
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}/revisions`);
    setRevisions(await response.json());
  };
  const restore = async (revisionId) => {
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}/restore/${revisionId}`, { method: 'POST' });
    const data = await response.json();
    if (response.ok) { setTitle(data.title); setDescription(data.description || ''); setFields(data.fields); onSaved(data); setMessage(`Restored version ${data.version}.`); }
  };

  return <section className="admin-panel">
    <div className="admin-header"><div><p className="eyebrow">Administrator view</p><h2>Form builder</h2></div><button type="button" className="text-button" onClick={onClose}>Close</button></div>
    <label>Form title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Form description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((field) => field.name)} strategy={verticalListSortingStrategy}>
        {fields.map((field, index) => <SortableField key={field.name} field={field} index={index} fields={fields} onChange={updateField} onRemove={removeField} />)}
      </SortableContext>
    </DndContext>
    <div className="admin-actions"><button type="button" className="secondary-button" onClick={() => setFields((current) => [...current, emptyField(current.length + 1)])}>Add field</button><button type="button" className="submit-button admin-save" onClick={save}>Save form</button></div>
    {message && <p className="draft-status" role="status">{message}</p>}
    <details className="revision-list"><summary onClick={loadRevisions}>Revision history</summary>{revisions.map((revision) => <div key={revision._id}><span>Version {revision.version} · {new Date(revision.createdAt).toLocaleString()}</span><button type="button" className="text-button" onClick={() => restore(revision._id)}>Restore</button></div>)}</details>
  </section>;
}