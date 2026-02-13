import { CheckCircle, Clock, CreditCard, Package, Truck, PackageCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTrackingStepperProps {
  currentStatus: string;
  trackingNumber?: string | null;
}

const steps = [
  { key: 'pending', label: 'Pesanan Dibuat', icon: Clock },
  { key: 'paid', label: 'Dibayar', icon: CreditCard },
  { key: 'processing', label: 'Diproses', icon: Package },
  { key: 'packed', label: 'Dikemas', icon: PackageCheck },
  { key: 'shipped', label: 'Dikirim', icon: Truck },
  { key: 'delivered', label: 'Sampai Tujuan', icon: CheckCircle },
  { key: 'completed', label: 'Selesai', icon: Star },
];

const getStepIndex = (status: string) => {
  const idx = steps.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
};

export const OrderTrackingStepper = ({ currentStatus, trackingNumber }: OrderTrackingStepperProps) => {
  if (currentStatus === 'cancelled' || currentStatus === 'return_requested') {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
        <p className="font-semibold text-destructive">
          {currentStatus === 'cancelled' ? 'Pesanan Dibatalkan' : 'Pengembalian Diajukan'}
        </p>
      </div>
    );
  }

  const currentIdx = getStepIndex(currentStatus);

  return (
    <div className="py-4">
      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIdx;
          const isCurrent = index === currentIdx;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-4 relative">
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-[19px] top-10 w-0.5 h-8",
                    index < currentIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}

              {/* Icon circle */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 transition-all duration-500",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-muted-foreground",
                  isCurrent && "ring-4 ring-primary/20 scale-110"
                )}
              >
                <StepIcon className="w-4 h-4" />
              </div>

              {/* Label */}
              <div className={cn("pb-8 pt-2", index === steps.length - 1 && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.key === 'shipped' && trackingNumber && isCompleted && (
                  <a
                    href={`https://cekresi.com/?noresi=${trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline mt-1 block"
                  >
                    Resi: {trackingNumber}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
