import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useConfirmPayment, usePayment } from "@/hooks/useWorklogs"

export const Route = createFileRoute("/_layout/payments/$paymentId")({
  component: PaymentDetailPage,
  head: () => ({
    meta: [{ title: "Payment Review - Payment Dashboard" }],
  }),
})

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/25">
          Pending
        </Badge>
      )
    case "confirmed":
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/25">
          Confirmed
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

function PaymentDetailPage() {
  const { paymentId } = Route.useParams()
  const { data: payment, isLoading, error } = usePayment(paymentId)
  const confirmPayment = useConfirmPayment()

  const handleConfirm = async () => {
    try {
      await confirmPayment.mutateAsync(paymentId)
      toast.success("Payment confirmed successfully")
    } catch {
      toast.error("Failed to confirm payment")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col gap-4">
        <Link to="/worklogs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Worklogs
          </Button>
        </Link>
        <div className="text-center py-12 text-destructive">
          Failed to load payment details.
        </div>
      </div>
    )
  }

  const totalWorklogs = payment.freelancer_groups.reduce(
    (sum, group) => sum + group.worklogs.length,
    0
  )

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
          <h1 className="text-2xl font-bold tracking-tight">Payment Review</h1>
          <p className="text-muted-foreground">
            Review and confirm payment batch
          </p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      {payment.status === "confirmed" && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-600">
                This payment has been confirmed. All included worklogs are
                marked as paid.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(payment.total_amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Freelancers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {payment.freelancer_groups.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Worklogs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalWorklogs}</p>
          </CardContent>
        </Card>
      </div>

      {payment.freelancer_groups.map((group) => (
        <Card key={group.freelancer_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.freelancer_name}</CardTitle>
              <span className="text-lg font-semibold">
                {formatCurrency(group.subtotal)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.worklogs.map((wl) => (
                    <TableRow key={wl.worklog_id}>
                      <TableCell>{wl.task_title}</TableCell>
                      <TableCell className="text-right">
                        {wl.total_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(wl.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {payment.status === "pending" && (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={confirmPayment.isPending}
          >
            {confirmPayment.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirm Payment
          </Button>
        </div>
      )}
    </div>
  )
}
