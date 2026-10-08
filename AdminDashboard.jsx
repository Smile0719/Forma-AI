import React, { useEffect, useState } from 'react';
import brandLogo from './logo.jpeg';
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
  const [activeView, setActiveView] = useState('overview');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState('all');
  const [serviceStatus, setServiceStatus] = useState('checking');
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
  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBaseUrl}/api/health`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Form service is unavailable.');
        const data = await response.json();
        const status = data.database === 'connected'
          ? 'Connected'
          : data.database === 'mock'
            ? 'Local demo mode'
            : 'Unavailable';
        if (!cancelled) setServiceStatus(status);
      })
      .catch(() => {
        if (!cancelled) setServiceStatus('Unavailable');
      });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  const reviewQueue = submissions.filter((item) => item.reviewRequired && item.status !== 'reviewed');
  const filteredSubmissions = submissions.filter((item) => {
    const formMatches = claimFilterSchemaId === 'all' || String(item.schemaId) === claimFilterSchemaId;
    const statusMatches = submissionStatus === 'all' || item.status === submissionStatus;
    const searchText = `${item.userEmail || ''} ${item.clientId || ''} ${schemas.find((form) => String(form._id) === String(item.schemaId))?.title || ''}`.toLowerCase();
    return formMatches && statusMatches && searchText.includes(submissionSearch.toLowerCase());
  });
  const weeklySubmissions = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      count: submissions.filter((item) => {
        const submittedAt = new Date(item.createdAt);
        return submittedAt >= day && submittedAt < nextDay;
      }).length
    };
  });
  const weeklyMaximum = Math.max(1, ...weeklySubmissions.map((day) => day.count));

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
    try {
      const status = submission.status === 'reviewed' ? 'submitted' : 'reviewed';
      const response = await fetch(`${apiBaseUrl}/api/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update submission review status.');
      setSubmissions((current) => current.map((item) => item._id === data._id ? data : item));
      setSelectedSubmission(data);
      setMessage(`Submission marked ${status}.`);
    } catch (error) {
      setMessage(error.message || 'Could not update submission review status.');
    }
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
    try {
      const response = await fetch(`${apiBaseUrl}/api/schemas/${schema._id}/revisions`, { headers: authHeaders });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load form revisions.');
      setRevisions(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || 'Could not load form revisions.');
    }
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
  useEffect(() => {
    if (activeView === 'revisions') loadRevisions();
  }, [activeView, schema._id]);

  const renderSubmissions = (limit) => {
    const rows = filteredSubmissions.slice(0, limit || filteredSubmissions.length);
    if (loadingSubmissions) return <p className="admin-empty">Loading submissions...</p>;
    if (!rows.length) return <p className="admin-empty">No submissions match these filters.</p>;
    return <div className="submission-table-wrap">
      <table className="submission-table"><thead><tr><th>Submitted</th><th>Form</th><th>Respondent</th><th>Status</th><th>AI confidence</th><th>Review</th><th>Details</th></tr></thead>
        <tbody>{rows.map((submission) => {
          const confidenceValues = Object.values(submission.confidence || {}).filter((value) => typeof value === 'number');
          const average = confidenceValues.length ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length) : null;
          const formTitle = schemas.find((item) => String(item._id) === String(submission.schemaId))?.title || 'Archived form';
          return <tr key={submission._id}>
            <td>{new Date(submission.createdAt).toLocaleString()}</td><td>{formTitle}</td>
            <td>{submission.userEmail || 'Anonymous'}</td>
            <td><span className={`admin-status admin-status--${submission.status}`}>{submission.status}</span></td>
            <td>{average === null ? '—' : `${average}%`}</td>
            <td>{submission.reviewRequired ? <span className="admin-review-flag">Needs review</span> : 'Clear'}</td>
            <td><button type="button" className="text-button" onClick={() => setSelectedSubmission(submission)}>Inspect</button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>;
  };

  const renderInspector = () => selectedSubmission && <article className="claim-inspector">
    <div className="admin-header"><div><p className="eyebrow">Submission details</p><h4>{schemas.find((item) => String(item._id) === String(selectedSubmission.schemaId))?.title || 'Archived form'}</h4></div><button type="button" className="text-button" onClick={() => setSelectedSubmission(null)}>Close</button></div>
    <dl>{Object.entries(selectedSubmission.values || {}).map(([name, value]) => {
      const label = schemas.find((item) => String(item._id) === String(selectedSubmission.schemaId))?.fields.find((field) => field.name === name)?.label || name;
      return <React.Fragment key={name}><dt>{label}</dt><dd>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</dd></React.Fragment>;
    })}</dl>
    <p>{selectedSubmission.reviewRequired ? 'AI confidence requires human review.' : 'No low-confidence values were flagged.'}</p>
    <button type="button" className="secondary-button" onClick={() => updateReviewStatus(selectedSubmission)}>{selectedSubmission.status === 'reviewed' ? 'Reopen review' : 'Mark reviewed'}</button>
  </article>;

  return <section className="admin-panel admin-dashboard">
    <header className="admin-topbar">
      <a className="admin-brand" href="/admin.html" aria-label="Forma AI admin home"><img className="admin-brand-logo" src={brandLogo} alt="" /><span>forma<span className="admin-brand-light">/</span></span></a>
      <div className="admin-topbar-meta"><span className={`service-indicator ${serviceStatus === 'Connected' ? 'is-online' : ''}`} /> Form service: {serviceStatus}<button type="button" className="admin-exit" onClick={onClose}>Open form</button></div>
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <p className="admin-side-label">Workspace</p>
        {[
          ['overview', 'Overview', '⌂'],
          ['builder', 'Form builder', '▤'],
          ['submissions', 'Submissions', '↗'],
          ['revisions', 'Revisions', '◷']
        ].map(([view, label, icon]) => <button key={view} type="button" className={`admin-nav-item${activeView === view ? ' is-active' : ''}`} onClick={() => setActiveView(view)}><span aria-hidden="true">{icon}</span>{label}{view === 'submissions' && reviewQueue.length > 0 && <b>{reviewQueue.length}</b>}</button>)}
        <div className="admin-sidebar-card"><span className="admin-sidebar-card-dot" /><strong>{schema.title}</strong><span>Published · version {schema.version || 1}</span><button type="button" onClick={() => setActiveView('builder')}>Edit current form <span aria-hidden="true">→</span></button></div>
      </aside>

      <div className="admin-content">
        <div className="admin-page-heading">
          <div><p className="eyebrow">Forma AI / Admin</p><h2>{activeView === 'overview' ? 'Workspace overview' : activeView === 'builder' ? 'Form builder' : activeView === 'submissions' ? 'Submissions' : 'Version history'}</h2><p>Manage your forms, track responses, and keep reviews moving.</p></div>
          <div className="admin-heading-actions"><span className="admin-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span><button type="button" className="secondary-button" onClick={loadSubmissions}>↻ Refresh</button></div>
        </div>
        {message && <p className="admin-message" role="status">{message}</p>}

        {activeView === 'overview' && <>
          <div className="admin-stat-grid">
            <article className="admin-stat-card"><span className="admin-stat-icon admin-stat-icon--peach">↗</span><span>Total submissions</span><strong>{submissions.length}</strong><small>Across all active forms</small></article>
            <article className="admin-stat-card"><span className="admin-stat-icon admin-stat-icon--yellow">!</span><span>Awaiting review</span><strong>{reviewQueue.length}</strong><small>{reviewQueue.length ? 'Needs a human check' : 'You are all caught up'}</small></article>
            <article className="admin-stat-card"><span className="admin-stat-icon admin-stat-icon--green">▤</span><span>Active forms</span><strong>{schemas.length || 1}</strong><small>{schemas.reduce((total, item) => total + (item.fields?.length || 0), 0) || fields.length} fields configured</small></article>
            <article className="admin-stat-card"><span className="admin-stat-icon admin-stat-icon--blue">✓</span><span>Reviewed</span><strong>{submissions.filter((item) => item.status === 'reviewed').length}</strong><small>Submissions completed</small></article>
          </div>
          <div className="admin-overview-grid">
            <section className="admin-card admin-chart-card">
              <div className="admin-card-heading"><div><h3>Response activity</h3><p>Submissions received over the last 7 days</p></div><span className="admin-chart-total">{weeklySubmissions.reduce((total, day) => total + day.count, 0)} <small>this week</small></span></div>
              <div className="admin-chart" role="img" aria-label="Bar chart showing daily form submissions for the last seven days">
                {weeklySubmissions.map((day) => <div className="admin-chart-column" key={day.label}><span className="admin-chart-value">{day.count || ''}</span><div className="admin-chart-track"><span style={{ height: `${Math.max(day.count ? 12 : 4, (day.count / weeklyMaximum) * 100)}%` }} /></div><span className="admin-chart-label">{day.label}</span></div>)}
              </div>
            </section>
            <section className="admin-card admin-form-card">
              <div className="admin-card-heading"><div><h3>Current form</h3><p>Your active intake form</p></div><button type="button" className="text-button" onClick={() => setActiveView('builder')}>Edit form →</button></div>
              <div className="admin-current-form"><span className="admin-form-symbol">F</span><div><strong>{schema.title}</strong><span>Version {schema.version || 1} · {fields.length} fields</span></div><span className="admin-published-pill">Published</span></div>
              <p className="admin-form-description">{schema.description || 'No form description has been added yet.'}</p>
              <div className="admin-form-footer"><span>Public form link</span><a href="/">{window.location.origin}/</a></div>
            </section>
          </div>
          <section className="admin-card admin-recent-card">
            <div className="admin-card-heading"><div><h3>Recent submissions</h3><p>A quick look at the latest form activity</p></div><button type="button" className="text-button" onClick={() => setActiveView('submissions')}>View all →</button></div>
            {renderSubmissions(5)}
          </section>
        </>}

        {activeView === 'builder' && <>
          <div className="admin-card admin-builder-card">
            <div className="admin-card-heading"><div><h3>Form settings</h3><p>Choose a form, then set its title, description, and fields.</p></div><span className="admin-published-pill">v{schema.version || 1} live</span></div>
            <div className="form-manager">
              <label>Manage form<select value={schema._id} onChange={(event) => selectSchema(event.target.value)}>{schemas.map((item) => <option key={item._id} value={item._id}>{item.title} · v{item.version || 1}</option>)}</select></label>
              <button type="button" className="secondary-button" onClick={createSchema}>+ Add form</button>
              <button type="button" className="text-button admin-archive" onClick={archiveSchema}>Archive form</button>
            </div>
            <label className="admin-form-label">Form title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="admin-form-label">Form description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <div className="admin-fields-heading"><div><h3>Form fields <span>{fields.length}</span></h3><p>Drag to reorder fields. Configure validation and visibility rules.</p></div><button type="button" className="secondary-button" onClick={() => setFields((current) => [...current, emptyField(current.length + 1)])}>+ Add field</button></div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((field) => field.name)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => <SortableField key={field.name} field={field} index={index} fields={fields} onChange={updateField} onRemove={removeField} />)}
              </SortableContext>
            </DndContext>
            <div className="admin-actions"><span>Changes are published as a new version.</span><button type="button" className="submit-button admin-save" onClick={save}>Save and publish</button></div>
          </div>
        </>}

        {activeView === 'submissions' && <section className="admin-card admin-submissions-card">
          <div className="admin-card-heading"><div><h3>All submissions</h3><p>Inspect responses and update review status.</p></div><span className="admin-total-pill">{submissions.length} total</span></div>
          <div className="admin-table-filters">
            <input aria-label="Search submissions" placeholder="Search respondent or form..." value={submissionSearch} onChange={(event) => setSubmissionSearch(event.target.value)} />
            <select aria-label="Filter submissions by status" value={submissionStatus} onChange={(event) => setSubmissionStatus(event.target.value)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="reviewed">Reviewed</option></select>
            <select aria-label="Filter submissions by form" value={claimFilterSchemaId} onChange={(event) => setClaimFilterSchemaId(event.target.value)}><option value="all">All forms</option>{schemas.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}</select>
          </div>
          {renderSubmissions()}
          {renderInspector()}
        </section>}

        {activeView === 'revisions' && <section className="admin-card admin-revisions-card">
          <div className="admin-card-heading"><div><h3>Version history</h3><p>Restore a previous version of {schema.title}.</p></div><button type="button" className="secondary-button" onClick={loadRevisions}>↻ Refresh history</button></div>
          <div className="admin-revision-current"><span className="admin-revision-dot" /><div><strong>Current version · v{schema.version || 1}</strong><span>{schema.title} · {fields.length} fields</span></div><span className="admin-published-pill">Live</span></div>
          {revisions.length ? revisions.map((revision) => <div className="admin-revision-row" key={revision._id}><span className="admin-revision-dot admin-revision-dot--old" /><div><strong>Version {revision.version}</strong><span>{new Date(revision.createdAt).toLocaleString()}</span></div><button type="button" className="text-button" onClick={() => restore(revision._id)}>Restore version</button></div>) : <p className="admin-empty">Open this page to load the form's saved revisions.</p>}
        </section>}
      </div>
    </div>
  </section>;
}