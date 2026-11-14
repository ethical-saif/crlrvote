import React, { useState } from 'react';
import { UserPlus, BadgeCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Input, Textarea, Select } from '../components/ui.jsx';

export default function Candidates() {
  const { toast } = useToast();
  const [form, setForm] = useState({ rollNo: '', name: '', position: '', manifesto: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate() {
    const e = {};
    const roll = form.rollNo.trim().toLowerCase();
    if (!roll) e.rollNo = 'Roll number is required.';
    if (!form.position) e.position = 'Please select a position.';
    if (form.manifesto.length > 200) e.manifesto = 'Manifesto must be 200 characters or less.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const body = {
        rollNo: form.rollNo.trim().toLowerCase(),
        name: form.name.trim(),
        position: form.position,
        manifesto: form.manifesto.trim(),
      };
      const { res, data } = await api('/api/candidates/register', { method: 'POST', body });
      if (!res.ok || !data.ok) {
        toast(data.error || 'Registration failed.', 'error');
        if (res.status === 400 || res.status === 404 || res.status === 409) {
          setErrors((e) => ({ ...e, rollNo: data.error || e.rollNo }));
        }
        return;
      }
      toast(data.message || 'Registered successfully.', 'success');
      setForm({ rollNo: '', name: '', position: '', manifesto: '' });
      setErrors({});
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/25 mb-1">
          <UserPlus className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Candidate Registration</h1>
        <p className="text-slate-600 dark:text-slate-300">Register yourself as a CR or LR candidate for your class.</p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Roll number"
            id="rollNo"
            placeholder="25280-cm-073"
            value={form.rollNo}
            onChange={(e) => setField('rollNo', e.target.value.toLowerCase())}
            autoComplete="off"
            error={errors.rollNo}
            required
          />
          <Input
            label="Name (optional)"
            id="name"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            hint="Leave blank to use the name from the student record."
          />
          <Select
            label="Position"
            id="position"
            value={form.position}
            onChange={(e) => setField('position', e.target.value)}
            error={errors.position}
            required
          >
            <option value="">Select position</option>
            <option value="CR">CR (Class Representative)</option>
            <option value="LR">LR (Lady Representative)</option>
          </Select>
          <Textarea
            label="Manifesto (optional)"
            id="manifesto"
            placeholder="Share a short manifesto with your classmates"
            value={form.manifesto}
            onChange={(e) => setField('manifesto', e.target.value)}
            maxLength={200}
            error={errors.manifesto}
            hint="Max 200 characters."
          />
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-500" /> Your roll number must be in the student list.
            </p>
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              Register
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
