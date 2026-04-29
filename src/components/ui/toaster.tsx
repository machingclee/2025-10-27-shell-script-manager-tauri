import { useToast } from "@/hooks/use-toast";
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2 } from "lucide-react";

export function Toaster() {
    const { toasts } = useToast();

    return (
        <ToastProvider duration={20000}>
            {toasts.map(function ({ id, title, description, action, ...props }) {
                return (
                    <Toast key={id} {...props}>
                        <div className="flex items-center gap-2">
                            {props.variant === "success" && (
                                <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
                            )}
                            <div className="grid gap-1">
                                {title && <ToastTitle>{title}</ToastTitle>}
                                {description && <ToastDescription>{description}</ToastDescription>}
                            </div>
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                );
            })}
            <ToastViewport />
        </ToastProvider>
    );
}
