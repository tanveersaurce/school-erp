import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Megaphone,
  ArrowLeft,
  Save,
  Send,
  Users,
  Bell,
} from 'lucide-react';
import {
  useGetAnnouncementByIdQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  usePublishAnnouncementMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import {
  AnnouncementCategory,
  NotificationPriority,
  NotificationChannel,
} from '@edusphere/common';

export const CreateEditAnnouncementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: existingData, isLoading: isFetching } = useGetAnnouncementByIdQuery(
    id || '',
    { skip: !isEditing }
  );

  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [updateAnnouncement, { isLoading: isUpdating }] = useUpdateAnnouncementMutation();
  const [publishAnnouncement, { isLoading: isPublishing }] = usePublishAnnouncementMutation();

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>(AnnouncementCategory.GENERAL);
  const [priority, setPriority] = useState<NotificationPriority>(NotificationPriority.NORMAL);
  const [isAllAudience, setIsAllAudience] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([NotificationChannel.IN_APP]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (existingData?.data) {
      const ann = existingData.data;
      setTitle(ann.title);
      setContent(ann.content);
      setCategory(ann.category);
      setPriority(ann.priority);
      setIsAllAudience(Boolean(ann.targetAudience?.isAll));
      setSelectedRoles(ann.targetAudience?.roles || []);
      setChannels(ann.channels || [NotificationChannel.IN_APP]);
      if (ann.publishAt) {
        setIsScheduled(new Date(ann.publishAt) > new Date());
        setPublishAt(new Date(ann.publishAt).toISOString().slice(0, 16));
      }
      if (ann.expiresAt) {
        setExpiresAt(new Date(ann.expiresAt).toISOString().slice(0, 16));
      }
      setAcknowledgementRequired(Boolean(ann.acknowledgementRequired));
    }
  }, [existingData]);

  const toggleRole = (role: string) => {
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const toggleChannel = (ch: NotificationChannel) => {
    if (channels.includes(ch)) {
      if (channels.length > 1) {
        setChannels(channels.filter((c) => c !== ch));
      }
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!title.trim() || !content.trim()) {
      setErrorMessage('Please enter both title and content.');
      return;
    }

    setErrorMessage('');
    const payload: any = {
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      channels,
      targetAudience: isAllAudience
        ? { isAll: true }
        : { roles: selectedRoles },
      publishAt: isScheduled && publishAt ? new Date(publishAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      acknowledgementRequired,
    };

    try {
      if (isEditing && id) {
        await updateAnnouncement({ id, data: payload }).unwrap();
        if (publishImmediately) {
          await publishAnnouncement(id).unwrap();
        }
        navigate(`/communication/announcements/${id}`);
      } else {
        const created = await createAnnouncement(payload).unwrap();
        const newId = (created.data as any)._id || created.data.id;
        if (publishImmediately) {
          await publishAnnouncement(newId).unwrap();
        }
        navigate('/communication/announcements');
      }
    } catch (err: any) {
      setErrorMessage(err?.data?.message || 'Failed to save announcement.');
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('/communication/announcements')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Announcements</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-indigo-600" />
          <span>{isEditing ? 'Edit Announcement' : 'Create New Announcement'}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Draft campus notifications, schedule targeted broadcasts, and request recipient receipts.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <Card className="p-6 sm:p-8 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Announcement Title <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="e.g., Annual Sports Day 2026 - Registration & Guidelines"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {Object.values(AnnouncementCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NotificationPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {Object.values(NotificationPriority).map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Announcement Content <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={6}
            placeholder="Write announcement details, instructions, schedules..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* Target Audience */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Target Audience</span>
          </h4>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
              <input
                type="radio"
                name="audienceType"
                checked={isAllAudience}
                onChange={() => setIsAllAudience(true)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Broadcast to Entire School Community (All students, parents, staff)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
              <input
                type="radio"
                name="audienceType"
                checked={!isAllAudience}
                onChange={() => setIsAllAudience(false)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Target Specific Roles</span>
            </label>

            {!isAllAudience && (
              <div className="pl-6 pt-2 flex flex-wrap gap-2">
                {['STUDENT', 'PARENT', 'TEACHER', 'STAFF'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      selectedRoles.includes(r)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {r}S
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Channels */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Delivery Channels</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.values(NotificationChannel).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  channels.includes(ch)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {ch.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Scheduling and Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span>Schedule for Future Release</span>
            </label>
            {isScheduled && (
              <Input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Optional Expiry Date</label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Acknowledgment */}
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={acknowledgementRequired}
              onChange={(e) => setAcknowledgementRequired(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span>Require recipients to submit read acknowledgment</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isCreating || isUpdating}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </Button>

          <Button
            variant="primary"
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isCreating || isUpdating || isPublishing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="w-4 h-4" />
            <span>{isScheduled ? 'Schedule Announcement' : 'Publish Immediately'}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
