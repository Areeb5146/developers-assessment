import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useWorklog } from "@/hooks/useWorklogs"

export const Route = createFileRoute("/_layout/worklogs/$worklogId")({
  component: WorklogDetailPage,
  head: () => ({
    meta: [{ title: "Worklog Detail - Payment Dashboard" }],
  }),
})

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/25">
          Pending
        </Badge>
      )
    case "in_review":
      return (
        <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/25">
          In Review
        </Badge>
      )
    case "paid":
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/25">
          Paid
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function WorklogDetailPage() {
  const { worklogId } = Route.useParams()
  const { data: worklog, isLoading, error } = useWorklog(worklogId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !worklog) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/worklogs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Worklogs
          </Button>
        </Link>
        <div className="text-center py-12 text-destructive">
          Failed to load worklog details.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/worklogs">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Worklogs
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {worklog.freelancer_name}
          </h1>
          <p className="text-muted-foreground">{worklog.task_title}</p>
        </div>
        <StatusBadge status={worklog.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{worklog.total_hours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(worklog.total_amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{worklog.time_entries.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worklog.time_entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">
                      {entry.hours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.hourly_rate)}/hr
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {worklog.total_hours.toFixed(1)}h
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold">
                    {formatCurrency(worklog.total_amount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
