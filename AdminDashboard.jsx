import React, { useEffect, useState } from 'react';
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

const getConditions = (showIf) => {
  if (Array.isArray(showIf?.conditions)) return showIf.conditions;
  return showIf?.field ? [showIf] : [];
};

const parseConditionValue = (controller, value) => {
  if (controller?.type === 'checkbox') return value === true || value === 'true';
  if (controller?.type === 'number') return value === '' ? '' : Number(value);
  return value;
};

const SortableField = ({ field, index, fields, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.name });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const update = (patch) => onChange(index, { ...field, ...patch });
  const updateValidation = (patch) => update({ validation: { ...field.validation, ...patch } });
  const conditions = getConditions(field.showIf);
  const setConditions = (next, operator = field.showIf?.operator || 'all') => {
    if (!next.length) return update({ showIf: undefined });
    update({ showIf: next.length === 1 ? next[0] : { operator, conditions: next } });
  };
  const updateCondition = (conditionIndex, patch) => {
    setConditions(conditions.map((condition, itemIndex) =>
      itemIndex === conditionIndex ? { ...condition, ...patch } : condition));
  };

  return (
    <article ref={setNodeRef} style={style} className="builder-field" {...attributes}>
      <button type="button" className="drag-handle" {...listeners} aria-label={`Reorder ${field.label}`}>
        ::
      </button>
      <div className="builder-field-grid">
        <label>Field key<input value={field.name} onChange={(event) => update({ name: event.target.value.replace(/\s+/g, '') })} /></label>
        <label>Label<input value={field.label} onChange={(event) => update({ label: event.target.value })} /></label>
        <label>Type<select value={field.type} onChange={(event) => update({ type: event.target.value })}>
          <option value="text">Text</option><option value="textarea">Long text</option><option value="email">Email</option><option value="date">Date</option><option value="number">Number</option><option value="select">Select</option><option value="radio">Radio</option><option value="checkbox">Checkbox</option>
        </select></label>
        {!['checkbox', 'radio'].includes(field.type) && <label>Placeholder<input value={field.placeholder || ''} onChange={(event) => update({ placeholder: event.target.value })} /></label>}
        {['select', 'radio'].includes(field.type) && <label className="builder-wide">Options (label:value, one per line)<textarea value={(field.options || []).map((option) => `${option.label}:${option.value}`).join('\n')} onChange={(event) => update({ options: event.target.value.split('\n').filter(Boolean).map((line) => { const [label, value = label] = line.split(':'); return { label: label.trim(), value: value.trim() }; }) })} /></label>}
        <label className="builder-check"><input type="checkbox" checked={Boolean(field.validation?.required)} onChange={(event) => updateValidation({ required: event.target.checked })} /> Required</label>
        {!['checkbox', 'radio'].includes(field.type) && <label>Validation regex<input placeholder="^[A-Z0-9-]+$" value={field.validation?.pattern || ''} onChange={(event) => updateValidation({ pattern: event.target.value })} /></label>}
        {field.type === 'number' && <>
          <label>Minimum<input type="number" value={field.validation?.minimum ?? ''} onChange={(event) => updateValidation({ minimum: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
          <label>Maximum<input type="number" value={field.validation?.maximum ?? ''} onChange={(event) => updateValidation({ maximum: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        </>}
        {conditions.map((condition, conditionIndex) => {
          const controller = fields.find((item) => item.name === condition.field);
          const usesOptions = ['select', 'radio'].includes(controller?.type);
          return <React.Fragment key={`${field.name}-condition-${conditionIndex}`}>
            <label>Show when field<select value={condition.field || ''} onChange={(event) => {
              const next = fields.find((item) => item.name === event.target.value);
              updateCondition(conditionIndex, { field: event.target.value, equals: next?.type === 'checkbox' ? true : next?.type === 'number' ? 0 : '' });
            }}>
              <option value="">Choose field</option>{fields.filter((item) => item.name !== field.name).map((item) => <option key={item.name} value={item.name}>{item.label}</option>)}
            </select></label>
            <label>Equals{controller?.type === 'checkbox'
              ? <select value={String(condition.equals)} onChange={(event) => updateCondition(conditionIndex, { equals: event.target.value === 'true' })}><option value="true">Yes</option><option value="false">No</option></select>
              : usesOptions
                ? <select value={String(condition.equals ?? '')} onChange={(event) => updateCondition(conditionIndex, { equals: event.target.value })}><option value="">Choose value</option>{(controller.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                : <input type={controller?.type === 'number' ? 'number' : 'text'} value={String(condition.equals ?? '')} onChange={(event) => updateCondition(conditionIndex, { equals: parseConditionValue(controller, event.target.value) })} />}
            </label>
            <button type="button" className="text-button" onClick={() => setConditions(conditions.filter((_, itemIndex) => itemIndex !== conditionIndex))}>Remove condition</button>
          </React.Fragment>;
        })}
        {conditions.length > 1 && <label>Condition logic<select value={field.showIf?.operator || 'all'} onChange={(event) => setConditions(conditions, event.target.value)}><option value="all">All conditions</option><option value="any">Any condition</option></select></label>}
        <button type="button" className="text-button" onClick={() => {
          const firstAvailable = fields.find((item) => item.name !== field.name);
          if (firstAvailable) setConditions([...conditions, { field: firstAvailable.name, equals: firstAvailable.type === 'checkbox' ? true : firstAvailable.type === 'number' ? 0 : '' }]);
        }}>Add condition</button>
      </div>
      <button type="button" className="builder-remove" onClick={() => onRemove(index)}>Remove</button>
    </article>
  );
};

export default function AdminDashboard({ schema, apiBaseUrl, authToken, onClose, onSaved }) {
  const [title, setTitle] = useState(schema.title);
  const [description, setDescription] = useState(schema.description || '');
  const [fields, setFields] = useState(schema.fields.map((field) => ({ ...field, validation: { ...field.validation } })));
  const [revisions, setRevisions] = useState([]);
  const [message, setMessage] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [claimFilterSchemaId, setClaimFilterSchemaId] = useState('all');
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const updateField = (index, field) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? field : item));
  const removeField = (index) => setFields((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setFields((current) => arrayMove(current, current.findIndex((field) => field.name === active.id), current.findIndex((field) => field.name === over.id)));
  };
  const authHeaders = { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };
  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions`, { headers: authHeaders });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load submissions.');
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const loadSchemas = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas`, { headers: authHeaders });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'Could not load forms.');
      setSchemas(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    setTitle(schema.title);
    setDescription(schema.description || '');
    setFields(schema.fields.map((field) => ({ ...field, validation: { ...field.validation } })));
    setSelectedSubmission(null);
    loadSubmissions();
  }, [schema._id]);
  useEffect(() => { loadSchemas(); }, []);

  const selectSchema = async (schemaId) => {
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schemaId}`, { headers: authHeaders });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(data.error || 'Could not load the selected form.');
    onSaved(data);
  };

  const createSchema = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'New form', description: '', fields: [] })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not create a form.');
      setSchemas((current) => [data, ...current]);
      onSaved(data);
      setMessage('New form created. Add fields and save to publish it.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const archiveSchema = async () => {
    if (!window.confirm(`Archive "${schema.title}"? Claims and audit history will be retained.`)) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}`, { method: 'DELETE', headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not archive form.');
      const remaining = schemas.filter((item) => item._id !== schema._id);
      setSchemas(remaining);
      if (remaining.length) onSaved(remaining[0]);
      else onClose();
      setMessage('Form archived. Existing claims and audit history were retained.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateReviewStatus = async (submission) => {
    const status = submission.status === 'reviewed' ? 'submitted' : 'reviewed';
    const response = await fetch(`${apiBaseUrl}/api/submissions/${submission._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(data.error || 'Could not update claim review status.');
    setSubmissions((current) => current.map((item) => item._id === data._id ? data : item));
    setSelectedSubmission(data);
  };

  const save = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify({ title, description, fields }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.details?.join(' ') || data.error || 'Could not save form.');
      setSchemas((current) => current.map((item) => item._id === data._id ? data : item));
      setMessage(`Saved version ${data.version}.`);
      onSaved(data);
    } catch (error) {
      setMessage(error.message || 'Could not save form.');
    }
  };
  const loadRevisions = async () => {
    const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}/revisions`);
    setRevisions(await response.json());
  };
  const restore = async (revisionId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}/restore/${revisionId}`, { method: 'POST', headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setMessage(data.error || 'Could not restore this revision.');
      setSchemas((current) => current.map((item) => item._id === data._id ? data : item));
      setTitle(data.title);
      setDescription(data.description || '');
      setFields(data.fields);
      onSaved(data);
      setMessage(`Restored version ${data.version}.`);
    } catch (error) {
      setMessage(error.message || 'Could not restore this revision.');
    }
  };

  return <section className="admin-panel">
    <div className="admin-header"><div><p className="eyebrow">Administrator view</p><h2>Form builder</h2></div><button type="button" className="text-button" onClick={onClose}>Close</button></div>
    <div className="form-manager">
      <label>Manage form<select value={schema._id} onChange={(event) => selectSchema(event.target.value)}>{schemas.map((item) => <option key={item._id} value={item._id}>{item.title} · v{item.version || 1}</option>)}</select></label>
      <button type="button" className="secondary-button" onClick={createSchema}>Add form</button>
      <button type="button" className="text-button" onClick={archiveSchema}>Archive form</button>
    </div>
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

    <section className="submission-panel">
      <div className="admin-header"><div><p className="eyebrow">Reviewer workspace</p><h3>Claims overview</h3></div><button type="button" className="text-button" onClick={loadSubmissions}>Refresh</button></div>
      <div className="claim-filters">
        <label>Filter by form<select value={claimFilterSchemaId} onChange={(event) => setClaimFilterSchemaId(event.target.value)}><option value="all">All forms</option>{schemas.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label>
        <span>{submissions.length} total claims</span>
        <span>{submissions.filter((item) => item.reviewRequired && item.status !== 'reviewed').length} awaiting review</span>
      </div>
      {loadingSubmissions ? <p>Loading submissions...</p> : submissions.length === 0 ? <p>No submitted claims yet.</p> : (
        <div className="submission-table-wrap">
          <table className="submission-table"><thead><tr><th>Submitted</th><th>Form</th><th>User</th><th>Status</th><th>AI confidence</th><th>Manual review</th><th>Claim</th></tr></thead>
            <tbody>{submissions.filter((item) => claimFilterSchemaId === 'all' || String(item.schemaId) === claimFilterSchemaId).map((submission) => {
              const confidenceValues = Object.values(submission.confidence || {}).filter((value) => typeof value === 'number');
              const average = confidenceValues.length ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) : null;
              const formTitle = schemas.find((item) => String(item._id) === String(submission.schemaId))?.title || 'Archived form';
              return <tr key={submission._id}><td>{new Date(submission.createdAt).toLocaleString()}</td><td>{formTitle}</td><td>{submission.userEmail || submission.clientId || 'Anonymous'}</td><td>{submission.status}</td><td>{average === null ? '—' : `${average}%`}</td><td>{submission.reviewRequired ? 'Required' : 'Not flagged'}</td><td><button type="button" className="text-button" onClick={() => setSelectedSubmission(submission)}>Inspect</button></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
      {selectedSubmission && <article className="claim-inspector">
        <div className="admin-header"><div><p className="eyebrow">Claim details</p><h4>{schemas.find((item) => String(item._id) === String(selectedSubmission.schemaId))?.title || 'Archived form'}</h4></div><button type="button" className="text-button" onClick={() => setSelectedSubmission(null)}>Close</button></div>
        <dl>{Object.entries(selectedSubmission.values || {}).map(([name, value]) => {
          const label = schemas.find((item) => String(item._id) === String(selectedSubmission.schemaId))?.fields.find((field) => field.name === name)?.label || name;
          return <React.Fragment key={name}><dt>{label}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></React.Fragment>;
        })}</dl>
        <p>{selectedSubmission.reviewRequired ? 'AI confidence requires human review.' : 'No low-confidence values were flagged.'}</p>
        <button type="button" className="secondary-button" onClick={() => updateReviewStatus(selectedSubmission)}>{selectedSubmission.status === 'reviewed' ? 'Reopen review' : 'Mark reviewed'}</button>
      </article>}
    </section>
  </section>;
}