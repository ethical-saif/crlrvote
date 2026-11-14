import React, { useRef, useState } from 'react';
import { UserPlus, BadgeCheck, ImagePlus, X, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { processPhotoFile } from '../lib/image.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Input, Textarea, Select } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Candidates() {
  const { toast } = useToast();
  const [form, setForm] = useState({ rollNo: '', name: '', position: '', manifesto: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const fileRef = useRef(null);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  }

  function clearPhoto() {
    setPhotoData(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoProcessing(true);
    try {
      const dataUrl = await processPhotoFile(file);
      setPhotoData(dataUrl);
      setPhotoPreview(dataUrl);
    } catch (err) {
      toast(err.message || 'Invalid image file.', 'error');
      clearPhoto();
    } finally {
      setPhotoProcessing(false);
    }
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
      if (photoData) body.photo = photoData;
      const { res, data } = await api('/api/candidates/register', { method: 'POST', body });
      if (!res.ok || !data.ok) {
        toast(data.error || 'Registration failed.', 'error');
        if (res.status === 400 || res.status === 404 || res.status === 409) {
          if (/photo|image/i.test(data.error || '')) {
            setErrors((e) => ({ ...e, photo: data.error }));
          } else {
            setErrors((e) => ({ ...e, rollNo: data.error || e.rollNo }));
          }
        }
        return;
      }
      setSuccess({
        rollNo: body.rollNo,
        name: body.name,
        position: body.position,
        hasPhoto: !!data.hasPhoto,
        photoPreview: photoPreview || null,
      });
      toast(data.message || 'Registered successfully.', 'success');
      setForm({ rollNo: '', name: '', position: '', manifesto: '' });
      clearPhoto();
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

      {success && (
        <Card className="p-5 sm:p-6 border-emerald-300/60 dark:border-emerald-500/40">
          <div className="flex items-center gap-4">
            <Avatar
              rollNo={success.rollNo}
              name={success.name || success.rollNo}
              hasPhoto={success.hasPhoto}
              previewSrc={success.hasPhoto ? success.photoPreview : null}
              size={64}
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Registration successful
              </p>
              <p className="text-slate-700 dark:text-slate-200 truncate">
                {success.name || 'Candidate'} ({success.rollNo}) — {success.position}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{success.hasPhoto ? 'Photo uploaded.' : 'No photo (initials avatar will be shown).'}</p>
            </div>
            <Button variant="secondary" type="button" onClick={() => setSuccess(null)} className="shrink-0">New</Button>
          </div>
        </Card>
      )}

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

          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">Photo (optional)</label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo preview" className="w-20 h-20 rounded-full object-cover border-2 border-indigo-300 dark:border-indigo-600 bg-slate-100" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 bg-white/50 dark:bg-slate-900/40">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPhotoChange}
                  className="block text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-300"
                />
                {photoPreview && (
                  <button type="button" onClick={clearPhoto} className="inline-flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400 hover:underline w-fit">
                    <X className="w-4 h-4" /> Remove photo
                  </button>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">JPG, PNG or WebP. Cropped &amp; compressed automatically.</p>
                {photoProcessing && <p className="text-xs text-indigo-600 dark:text-indigo-400">Processing photo…</p>}
              </div>
            </div>
            {errors.photo && <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400" role="alert">{errors.photo}</p>}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-500" /> Your roll number must be in the student list.
            </p>
            <Button type="submit" loading={loading || photoProcessing} className="w-full sm:w-auto">
              Register
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
