import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import api from "@/lib/api"
import type {
  PaymentConfirmResponse,
  PaymentCreateRequest,
  PaymentCreateResponse,
  PaymentDetailResponse,
  WorkLogDetailResponse,
  WorkLogListResponse,
} from "@/types/worklog"

interface WorklogFilters {
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export function useWorklogs(filters: WorklogFilters = {}) {
  return useQuery<WorkLogListResponse>({
    queryKey: ["worklogs", filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (filters.start_date) params.start_date = filters.start_date
      if (filters.end_date) params.end_date = filters.end_date
      if (filters.skip !== undefined) params.skip = filters.skip
      if (filters.limit !== undefined) params.limit = filters.limit
      const response = await api.get("/api/v1/worklogs/", { params })
      return response.data
    },
  })
}

export function useWorklog(id: string) {
  return useQuery<WorkLogDetailResponse>({
    queryKey: ["worklog", id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/worklogs/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()
  return useMutation<PaymentCreateResponse, Error, PaymentCreateRequest>({
    mutationFn: async (body) => {
      const response = await api.post("/api/v1/payments/", body)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worklogs"] })
    },
  })
}

export function usePayment(id: string) {
  return useQuery<PaymentDetailResponse>({
    queryKey: ["payment", id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/payments/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation<PaymentConfirmResponse, Error, string>({
    mutationFn: async (paymentId) => {
      const response = await api.patch(
        `/api/v1/payments/${paymentId}/confirm`
      )
      return response.data
    },
    onSuccess: (_data, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ["payment", paymentId] })
      queryClient.invalidateQueries({ queryKey: ["worklogs"] })
    },
  })
}
