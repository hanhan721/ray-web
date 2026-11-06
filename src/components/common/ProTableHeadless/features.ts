import {
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
} from '@tanstack/vue-table'

export const proTableFeatures = tableFeatures({
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
})

export type HeadlessColumn<T> = ColumnDef<typeof proTableFeatures, T>
