import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ClipboardList, Loader2 } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCreatePayment, useWorklogs } from "@/hooks/useWorklogs"
import type { WorkLogListItem } from "@/types/worklog"

export const Route = createFileRoute("/_layout/worklogs/")({
  component: WorklogsPage,
  head: () => ({
    meta: [{ title: "Worklogs - Payment Dashboard" }],
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function WorklogsPage() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useWorklogs({
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    limit: 100,
  })

  const createPayment = useCreatePayment()

  const worklogs = data?.data ?? []

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    const selectableWorklogs = worklogs.filter((wl) => wl.status === "pending")
    if (selectedIds.size === selectableWorklogs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableWorklogs.map((wl) => wl.id)))
    }
  }

  const selectedWorklogs = worklogs.filter((wl) => selectedIds.has(wl.id))
  const selectedTotal = selectedWorklogs.reduce(
    (sum, wl) => sum + wl.total_amount,
    0
  )

  const handleCreatePayment = async () => {
    const result = await createPayment.mutateAsync({
      worklog_ids: Array.from(selectedIds),
    })
    setSelectedIds(new Set())
    navigate({ to: "/payments/$paymentId", params: { paymentId: result.id } })
  }

  const handleRowClick = (worklog: WorkLogListItem) => {
    navigate({ to: "/worklogs/$worklogId", params: { worklogId: worklog.id } })
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">
          WorkLog Payment Dashboard
        </h1>
        <p className="text-muted-foreground">
          Review freelancer worklogs and process payments
        </p>
      </div>

      <Card className="shrink-0">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("")
                  setEndDate("")
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive">
          Failed to load worklogs. Please try again.
        </div>
      )}

      {!isLoading && !error && worklogs.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No worklogs found</h3>
          <p className="text-muted-foreground">
            Try adjusting your date filters
          </p>
        </div>
      )}

      {!isLoading && !error && worklogs.length > 0 && (
        <>
          <Card className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-auto scrollbar-hidden">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          worklogs.filter((wl) => wl.status === "pending")
                            .length > 0 &&
                          selectedIds.size ===
                            worklogs.filter((wl) => wl.status === "pending")
                              .length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all pending worklogs"
                      />
                    </TableHead>
                    <TableHead>Freelancer</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                    <TableHead className="text-right">Amount Earned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worklogs.map((wl) => (
                    <TableRow
                      key={wl.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(wl)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(wl.id)}
                          onCheckedChange={() => toggleSelection(wl.id)}
                          disabled={wl.status !== "pending"}
                          aria-label={`Select worklog for ${wl.freelancer_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {wl.freelancer_name}
                      </TableCell>
                      <TableCell>{wl.task_title}</TableCell>
                      <TableCell className="text-right">
                        {wl.total_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(wl.total_amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wl.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(wl.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {selectedIds.size > 0 && (
            <Card className="shrink-0 border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {selectedIds.size} worklog
                      {selectedIds.size !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-2xl font-bold">
                      Total: {formatCurrency(selectedTotal)}
                    </p>
                  </div>
                  <Button
                    onClick={handleCreatePayment}
                    disabled={createPayment.isPending}
                    size="lg"
                  >
                    {createPayment.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Payment Batch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
