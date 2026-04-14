import { useEffect, useState } from 'react';
import { CardSkeleton } from '@/components/ui/skeleton-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { escalationsApi } from '@/services/api';
import { useDataStore, useAuthStore } from '@/store/useStore';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Pill,
  MapPin,
  Loader2,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatTimeToAmPm } from '@/lib/utils';
import type { Escalation } from '@/types';

export function EscalationsList() {
  const { user } = useAuthStore();
  const { escalations, setEscalations, resolveEscalation } = useDataStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('open');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const loadEscalations = async () => {
      setIsLoading(true);
      try {
        const response = await escalationsApi.getOpen(page, pageSize);
        if (response.success) {
          setEscalations(response.data!);
        }
      } catch (error) {
        console.error('Error loading escalations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEscalations();
  }, [setEscalations, page]);

  const handleResolve = async (escalation: Escalation) => {
    if (!user) return;
    
    setResolvingId(escalation.id);
    try {
      const response = await escalationsApi.resolve(escalation.id, user.id);
      if (response.success) {
        resolveEscalation(escalation.id, user.id);
      }
    } catch (error) {
      console.error('Error resolving escalation:', error);
    } finally {
      setResolvingId(null);
    }
  };

  const openEscalations = escalations.filter((e) => e.status === 'open');
  const resolvedEscalations = escalations.filter((e) => e.status === 'resolved');

  const EscalationCard = ({ escalation }: { escalation: Escalation }) => (
    <div className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold">{escalation.patientName}</p>
            <div className="flex items-center text-sm text-gray-500 space-x-2">
              <MapPin className="w-3 h-3" />
              <span>{escalation.ward}</span>
            </div>
          </div>
        </div>
        <Badge
          variant={escalation.status === 'open' ? 'destructive' : 'secondary'}
        >
          {escalation.status === 'open' ? 'Open' : 'Resolved'}
        </Badge>
      </div>

      <div className="flex items-center space-x-4 p-3 bg-red-50 rounded-lg">
        <Pill className="w-5 h-5 text-red-500" />
        <div>
          <p className="font-medium">{escalation.medicineName}</p>
          <p className="text-sm text-gray-500">
            Scheduled for {formatTimeToAmPm(escalation.scheduledTime)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          Escalated at {format(new Date(escalation.escalatedAt), 'h:mm a')}
        </div>
        <span className="text-gray-400">
          To: {escalation.escalatedToName}
        </span>
      </div>

      {escalation.status === 'open' && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => handleResolve(escalation)}
          disabled={resolvingId === escalation.id}
        >
          {resolvingId === escalation.id ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resolving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Mark as Resolved
            </>
          )}
        </Button>
      )}

      {escalation.status === 'resolved' && escalation.resolvedAt && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Resolved at {format(new Date(escalation.resolvedAt), 'h:mm a')}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Escalations</h2>
          <p className="text-gray-500 mt-1">Manage missed dose escalations and take action</p>
        </div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Escalations</h2>
        <p className="text-gray-500 mt-1">
          Manage missed dose escalations and take action
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Escalations</p>
                <p className="text-2xl font-bold text-red-700">
                  {openEscalations.length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-700">
                  {resolvedEscalations.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="open">
            Open ({openEscalations.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedEscalations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openEscalations.map((escalation) => (
              <EscalationCard key={escalation.id} escalation={escalation} />
            ))}
            {openEscalations.length === 0 && (
              <div className="col-span-full text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-900">
                  All clear!
                </p>
                <p className="text-gray-500">
                  No open escalations at the moment
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resolvedEscalations.map((escalation) => (
              <EscalationCard key={escalation.id} escalation={escalation} />
            ))}
            {resolvedEscalations.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No resolved escalations yet</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6 border-t pt-4">
          <p className="text-sm text-gray-500">
            Showing page {page}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={escalations.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
