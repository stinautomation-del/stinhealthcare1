import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TableSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-2">
        <div className="h-6 w-1/4 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-4 w-1/3 bg-gray-100 animate-pulse rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-4 py-2 border-b">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 animate-pulse rounded"></div>
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 py-4 border-b last:border-0">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-8 bg-gray-50 animate-pulse rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-48">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-full"></div>
              <div className="h-5 w-16 bg-gray-100 animate-pulse rounded text-right"></div>
            </div>
            <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-1/2 bg-gray-100 animate-pulse rounded"></div>
            <div className="h-10 w-full bg-gray-50 animate-pulse rounded mt-2"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
