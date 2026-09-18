import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  Edit,
  Send,
  XCircle,
  Archive,
} from 'lucide-react';
import {
  useGetAnnouncementByIdQuery,
  usePublishAnnouncementMutation,
  useCancelAnnouncementMutation,
  useArchiveAnnouncementMutation,
  useAcknowledgeAnnouncementMutation,
} from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { AnnouncementStatus } from '@edusphere/common';

export const AnnouncementDetailsPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: res, isLoading, refetch } = useGetAnnouncementByIdQuery(id, { skip: !id });
  const [publishAnnouncement, { isLoading: isPublishing }] = usePublishAnnouncementMutation();
  const [cancelAnnouncement, { isLoading: isCancelling }] = useCancelAnnouncementMutation();
  const [archiveAnnouncement, { isLoading: isArchiving }] = useArchiveAnnouncementMutation();
  const [acknowledgeAnnouncement, { isLoading: isAcknowledging }] = useAcknowledgeAnnouncementMutation();

  const announcement = res?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-xl font-bold text-gray-800">Announcement Not Found</h2>
        <Button variant="outline" onClick={() => navigate('/communication/announcements')} className="mt-4">
          Back to Announcements
        </Button>
      </div>
    );
  }

  const handlePublish = async () => {
    if (confirm('Publish this announcement immediately to all designated audience members?')) {
      await publishAnnouncement(id);
      refetch();
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Please enter cancellation reason:') || 'Cancelled by administrator';
    await cancelAnnouncement({ id, reason });
    refetch();
  };

  const handleArchive = async () => {
    if (confirm('Archive this announcement? It will no longer appear on active feeds.')) {
      await archiveAnnouncement(id);
      refetch();
    }
  };

  const handleAcknowledge = async () => {
    await acknowledgeAnnouncement(id);
    refetch();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/communication/announcements')}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Announcements</span>
      </button>

      {/* Main Content Card */}
      <Card className="p-6 sm:p-8">
        {/* Status and Action header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
              {announcement.category}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                announcement.status === AnnouncementStatus.PUBLISHED
                  ? 'bg-green-100 text-green-800'
                  : announcement.status === AnnouncementStatus.SCHEDULED
                  ? 'bg-blue-100 text-blue-800'
                  : announcement.status === AnnouncementStatus.CANCELLED
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {announcement.status}
            </span>
            <span className="text-xs font-medium text-gray-500">
              Priority: <strong className="text-gray-700">{announcement.priority}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {announcement.status === AnnouncementStatus.DRAFT && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/communication/announcements/${id}/edit`)}
                  className="flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </Button>
              </>
            )}

            {announcement.status === AnnouncementStatus.PUBLISHED && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Title & Metadata */}
        <div className="mt-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {announcement.title}
          </h1>

          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Published:{' '}
              {new Date(
                announcement.publishedAt || announcement.publishAt || announcement.createdAt
              ).toLocaleString()}
            </span>
            {announcement.expiresAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              Audience:{' '}
              {announcement.targetAudience?.isAll
                ? 'All School Community'
                : 'Targeted Groups'}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-6 prose max-w-none text-gray-800 text-base leading-relaxed whitespace-pre-line bg-gray-50/50 p-5 rounded-xl border border-gray-100">
          {announcement.content}
        </div>

        {/* Acknowledgement Box */}
        {announcement.acknowledgementRequired && (
          <div className="mt-8 p-5 bg-amber-50/80 border border-amber-200 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Acknowledgment Required</span>
                </h4>
                <p className="text-xs text-amber-700 mt-1">
                  The author requested receipt acknowledgment for this notice. Total acknowledgments logged:{' '}
                  <strong>{announcement.acknowledgements?.length || 0}</strong>.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                I Acknowledge
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
