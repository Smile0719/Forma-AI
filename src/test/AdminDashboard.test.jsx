import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../../AdminDashboard.jsx';

const schema = {
  _id: 'form-1',
  title: 'Incident intake',
  description: 'Capture incident details.',
  version: 3,
  fields: [{ name: 'summary', label: 'Summary', type: 'text', validation: {} }]
};

const submissions = [
  {
    _id: 'submission-1',
    schemaId: 'form-1',
    userEmail: 'alex@example.com',
    values: { summary: 'A test incident' },
    confidence: { summary: 62 },
    reviewRequired: true,
    status: 'submitted',
    createdAt: '2026-10-08T10:00:00.000Z'
  }
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      const address = String(url);
      const data = address.endsWith('/api/submissions')
        ? submissions
        : address.endsWith('/api/schemas')
          ? [schema]
          : address.endsWith('/api/health')
            ? { database: 'connected' }
            : [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data)
      });
    });
  });

  it('shows workspace metrics and lets an admin inspect a submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AdminDashboard
        schema={schema}
        apiBaseUrl="http://localhost:5000"
        authToken="admin-token"
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );

    expect(await screen.findByText('Awaiting review')).toBeInTheDocument();
    expect(screen.getByText('Total submissions')).toBeInTheDocument();
    expect(await screen.findByText(/Form service: Connected/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Form builder/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open form' }));
    expect(onClose).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: /Submissions/ }));
    await user.click(await screen.findByRole('button', { name: 'Inspect' }));

    expect(screen.getByText('A test incident')).toBeInTheDocument();
    expect(screen.getByText('AI confidence requires human review.')).toBeInTheDocument();
  });

  it('clearly reports when the API is using its in-memory demo database', async () => {
    global.fetch.mockImplementation((url) => {
      const address = String(url);
      const data = address.endsWith('/api/health')
        ? { database: 'mock' }
        : address.endsWith('/api/submissions')
          ? submissions
          : address.endsWith('/api/schemas')
            ? [schema]
            : [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data)
      });
    });

    render(
      <AdminDashboard
        schema={schema}
        apiBaseUrl="http://localhost:5000"
        authToken="admin-token"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(await screen.findByText(/Form service: Local demo mode/)).toBeInTheDocument();
  });
});
