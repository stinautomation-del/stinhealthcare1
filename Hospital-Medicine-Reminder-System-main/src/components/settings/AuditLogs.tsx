import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { logsApi } from '@/services/api';
import { TableSkeleton } from '@/components/ui/skeleton-loader';
import { History, User as UserIcon, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      const res = await logsApi.getAll(page, pageSize);
      if (res.success) {
        setLogs(res.data!);
        setTotalCount(res.count || 0);
      }
      setIsLoading(false);
    };
    fetchLogs();
  }, [page]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-700 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'patients': return <UserIcon className="w-3 h-3 mr-1" />;
      case 'prescriptions': return <Activity className="w-3 h-3 mr-1" />;
      case 'schedule_entries': return <History className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Action Audit Trail</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Historical record of all clinical and system operations
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            {totalCount} Total Events
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="max-w-[300px]">Details Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50/30">
                    <TableCell className="text-xs font-medium text-gray-500">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{log.actorName}</span>
                        <span className="text-xs text-gray-400 capitalize">{log.actorRole.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getActionColor(log.action)} uppercase text-[10px] px-1.5 py-0`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs text-gray-600">
                        {getEntityIcon(log.entityType)}
                        <span className="capitalize">{log.entityType.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 truncate max-w-[300px]">
                      {log.action === 'INSERT' ? 'Created new record' : 'Modified existing record'} (ID: {log.entityId.slice(0, 8)}...)
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-gray-400">
                      No audit events recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
             <p className="text-xs text-gray-400">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
             </p>
             <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button 
                   variant="outline" 
                   size="sm"
                   onClick={() => setPage(p => p + 1)}
                   disabled={page * pageSize >= totalCount}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
