import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * The application's one button.
 *
 * Variants are named by the decision they carry rather than by colour, so a
 * screen cannot invent a fifth kind of emphasis. `accent` is the ceremonial
 * one — an offer letter, a certificate, a sponsor invoice — and is deliberately
 * scarce: if two buttons on a screen are gold, neither of them means anything.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,box-shadow,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sheet hover:bg-secondary',
        accent: 'bg-accent text-accent-foreground shadow-sheet hover:brightness-105',
        outline:
          'border border-input bg-card text-foreground hover:border-primary/40 hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-white shadow-sheet hover:brightness-110',
        link: 'h-auto p-0 text-primary underline underline-offset-4 hover:text-secondary',
      },
      size: {
        // 44px minimum touch target — cashiers use this on tablets, often
        // in a hurry.
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
