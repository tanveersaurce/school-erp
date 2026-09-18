import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useGetAnnouncementsQuery } from '../../features/communication/communicationApi.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { AnnouncementCategory, NotificationPriority } from '@edusphere/common';

export const AnnouncementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: res, isLoading } = useGetAnnouncementsQuery({
    page,
    limit: 12,
    search: searchTerm || undefined,
    category: categoryFilter || undefined,
  });

  const announcements = res?.data?.items || [];
  const total = res?.data?.total || 0;
  const totalPages = Math.ceil(total / 12) || 1;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'EMERGENCY':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EVENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ACADEMIC':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HOLIDAY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'FACILITIES':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-indigo-600" />
            <span>School Announcements</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Official campus news, event schedules, policy updates, and important school alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => navigate('/communication/announcements/new')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <Input
                placeholder="Search announcements by title or content..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {Object.values(AnnouncementCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Announcements Feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700">No Announcements</h3>
          <p className="text-sm text-gray-500 mt-1">
            There are currently no active announcements matching your criteria.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann: any) => (
            <Card
              key={ann._id || ann.id}
              className="p-5 hover:shadow-lg transition-all border border-gray-100 hover:border-indigo-200 cursor-pointer flex flex-col justify-between"
              onClick={() => navigate(`/communication/announcements/${ann._id || ann.id}`)}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryColor(
                      ann.category
                    )}`}
                  >
                    {ann.category}
                  </span>
                  {ann.priority === NotificationPriority.URGENT ||
                  ann.priority === NotificationPriority.HIGH ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {ann.priority}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {ann.title}
                </h3>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3 whitespace-pre-line">
                  {ann.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(ann.publishedAt || ann.publishAt || ann.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {ann.acknowledgementRequired && (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3" />
                    Ack Required
                  </span>
                )}
                <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                  <span>Read more</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6">
          <p className="text-sm text-gray-500">
            Showing {announcements.length} of {total} announcements
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-gray-700 self-center px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
