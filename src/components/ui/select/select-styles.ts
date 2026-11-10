import { cva } from 'class-variance-authority'

/**
 * 下拉类控件的公共视觉 token。
 *
 * 尺寸与 `Input` 对齐：默认 36px 高、16px 字号、5.76px 圆角，
 * 让搜索区、表单和分页里的选择器保持同一种控件密度。
 */
export const selectTriggerVariants = cva(
  'group/select border-input bg-input/20 text-foreground hover:bg-input/30 dark:bg-input/30 dark:hover:bg-input/40 focus-within:border-ring focus-within:ring-ring/30 focus-visible:border-ring focus-visible:ring-ring/30 data-[state=open]:border-ring data-[state=open]:ring-ring/30 data-[open]:border-ring data-[open]:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[invalid]:border-destructive data-[invalid]:ring-destructive/20 relative flex w-full min-w-0 items-center gap-2 rounded-md border text-left transition-[color,background-color,border-color,box-shadow] outline-none focus-within:ring-2 focus-visible:ring-2 data-[state=open]:ring-2 data-[open]:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 px-2.5 text-xs',
        default: 'h-9 px-2.5 text-sm',
        lg: 'h-9 px-3 text-sm',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

export const selectPanelClass =
  'bg-popover text-popover-foreground ring-foreground/10 z-50 overflow-x-hidden rounded-lg shadow-lg shadow-black/5 ring-1'

export const selectItemClass =
  'relative flex min-h-8 w-full cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1 text-sm outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=checked]:font-medium'
