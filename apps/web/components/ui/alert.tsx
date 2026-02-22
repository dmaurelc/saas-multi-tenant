import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const icons = {
      default: null,
      destructive: <AlertCircle className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          'flex items-start gap-3',
          variant === 'destructive' &&
            'border-red-500/50 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
          variant === 'success' &&
            'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
