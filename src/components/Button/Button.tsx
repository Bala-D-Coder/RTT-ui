import type { ComponentPropsWithoutRef } from 'react'
import { cx } from '@/utils/format'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'onBar' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'fab'

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, className)}
      data-variant={variant}
      data-size={size}
      {...rest}
    />
  )
}
