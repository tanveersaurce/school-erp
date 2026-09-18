import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Save,
  Send,
  Eye,
  Tag,
  Archive,
} from 'lucide-react';
import {
  useGetTemplateByIdQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  usePublishTemplateMutation,
  useArchiveTemplateMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import {
  NotificationCategory,
  NotificationChannel,
  TemplateStatus,
} from '@edusphere/common';

const COMMON_SAMPLE_VARS = [
  'recipientName',
  'schoolName',
  'title',
  'dueDate',
  'amount',
  'invoiceNumber',
  'percentage',
  'examName',
  'date',
  'link',
];

export const NotificationTemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: existingRes, isLoading: isFetching } = useGetTemplateByIdQuery(id || '', {
    skip: !isEditing,
  });

  const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
  const [publishTemplate, { isLoading: isPublishing }] = usePublishTemplateMutation();
  const [archiveTemplate, { isLoading: isArchiving }] = useArchiveTemplateMutation();

  // Form State
  const [templateKey, setTemplateKey] = useState('');
  const [eventType, setEventType] = useState('');
  const [category, setCategory] = useState<NotificationCategory>(NotificationCategory.ACADEMIC);
  const [channel, setChannel] = useState<NotificationChannel>(NotificationChannel.IN_APP);
  const [subject, setSubject] = useState('');
  const [titleTemplate, setTitleTemplate] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('');
  const [status, setStatus] = useState<TemplateStatus>(TemplateStatus.DRAFT);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (existingRes?.data) {
      const t = existingRes.data;
      setTemplateKey(t.templateKey);
      setEventType(t.eventType);
      setCategory(t.category);
      setChannel(t.channel);
      setSubject(t.subject || '');
      setTitleTemplate(t.titleTemplate);
      setBodyTemplate(t.bodyTemplate);
      setStatus(t.status);
    }
  }, [existingRes]);

  // Insert token into body
  const insertToken = (token: string) => {
    const formatted = `{{${token}}}`;
    setBodyTemplate((prev) => prev + ' ' + formatted);
  };

  // Live rendered preview simulation
  const renderSample = (templateStr: string) => {
    return templateStr
      .replace(/{{recipientName}}/g, 'Alex Johnson')
      .replace(/{{schoolName}}/g, 'Greenwood International')
      .replace(/{{title}}/g, 'Midterm Physics Assignment')
      .replace(/{{dueDate}}/g, 'Oct 15, 2026')
      .replace(/{{amount}}/g, '$450.00')
      .replace(/{{invoiceNumber}}/g, 'INV-2026-089')
      .replace(/{{percentage}}/g, '68%')
      .replace(/{{examName}}/g, 'Final Term Mathematics')
      .replace(/{{date}}/g, 'Tomorrow, 9:00 AM')
      .replace(/{{link}}/g, 'https://edusphere.io/portal');
  };

  const handleSave = async (shouldPublish = false) => {
    if (!templateKey.trim() || !eventType.trim() || !titleTemplate.trim() || !bodyTemplate.trim()) {
      setErrorMessage('Please fill in all required template fields.');
      return;
    }

    setErrorMessage('');
    const payload = {
      templateKey: templateKey.trim().toUpperCase(),
      eventType: eventType.trim(),
      category,
      channel,
      subject: channel === NotificationChannel.EMAIL ? subject.trim() : undefined,
      titleTemplate: titleTemplate.trim(),
      bodyTemplate: bodyTemplate.trim(),
      status: shouldPublish ? TemplateStatus.ACTIVE : status,
    };

    try {
      if (isEditing && id) {
        await updateTemplate({ id, data: payload }).unwrap();
        if (shouldPublish) {
          await publishTemplate(id).unwrap();
        }
        navigate('/communication/templates');
      } else {
        const res = await createTemplate(payload).unwrap();
        if (shouldPublish) {
          const newId = (res.data as any)._id || res.data.id;
          await publishTemplate(newId).unwrap();
        }
        navigate('/communication/templates');
      }
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to save template.');
    }
  };

  const handleArchive = async () => {
    if (id && confirm('Archive this template? Active events will no longer use it.')) {
      await archiveTemplate(id);
      navigate('/communication/templates');
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/communication/templates')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Templates</span>
      </button>

      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600" />
            <span>{isEditing ? `Edit Template: ${templateKey}` : 'Create Notification Template'}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Design dynamic notification messages with live variable substitution and multi-channel preview.
          </p>
        </div>

        {isEditing && status === TemplateStatus.ACTIVE && (
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={isArchiving}
            className="flex items-center gap-1.5 text-gray-600"
          >
            <Archive className="w-4 h-4" />
            <span>Archive Template</span>
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Template Key <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. ASSIGNMENT_CREATED"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value.toUpperCase())}
                  disabled={isEditing}
                  className="font-mono uppercase text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Event Trigger <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. academic.assignment_created"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="font-mono text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.values(NotificationCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as NotificationChannel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {Object.values(NotificationChannel).map((ch) => (
                    <option key={ch} value={ch}>
                      {ch.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {channel === NotificationChannel.EMAIL && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Email Subject Template
                </label>
                <Input
                  placeholder="e.g. {{schoolName}}: Important Assignment Update"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Title Template <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. New Assignment Posted: {{title}}"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                className="text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Body Template <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Write your template text. You may include tokens like {{recipientName}}, {{dueDate}}, etc."
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-sans"
                required
              />
            </div>

            {/* Variable token helpers */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <span>Click token to insert into body:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SAMPLE_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertToken(v)}
                    className="px-2 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-gray-200 rounded font-mono text-[11px] text-gray-700 transition-colors"
                  >
                    +{`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleSave(false)}
                disabled={isCreating || isUpdating}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Draft</span>
              </Button>

              <Button
                variant="primary"
                type="button"
                onClick={() => handleSave(true)}
                disabled={isCreating || isUpdating || isPublishing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Send className="w-4 h-4" />
                <span>Publish Template</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Live Simulation Preview */}
        <div className="space-y-4">
          <Card className="p-5 bg-gradient-to-b from-white to-slate-50 border border-indigo-100 sticky top-6">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Simulated Live Preview</span>
            </h3>

            <div className="space-y-4">
              <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {channel} Channel Preview
                </span>

                {channel === NotificationChannel.EMAIL && (
                  <div className="mt-2 text-xs border-b border-gray-100 pb-2">
                    <span className="font-semibold text-gray-500">Subject: </span>
                    <span className="text-gray-900 font-medium">
                      {subject ? renderSample(subject) : 'No subject provided'}
                    </span>
                  </div>
                )}

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-gray-900">
                    {titleTemplate ? renderSample(titleTemplate) : 'Notification Title Preview'}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line leading-relaxed">
                    {bodyTemplate
                      ? renderSample(bodyTemplate)
                      : 'Notification body text with {{variables}} will preview here automatically.'}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">
                💡 Variable tokens (e.g.{' '}
                <code className="font-mono text-gray-600">{'{{recipientName}}'}</code>) are
                sanitized against XSS and populated dynamically during real-time event dispatch.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
