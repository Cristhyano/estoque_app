import React, { type ReactNode } from "react"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string
    icon?: ReactNode | React.ElementType
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ icon, label, id, className, ...props }, ref) => {
        const inputId = id ?? React.useId()
        const renderedIcon = icon
            ? React.isValidElement(icon)
                ? icon
                : React.createElement(icon as React.ElementType, {
                    className: "text-neutral-600 w-4",
                })
            : null

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium">
                        <span className="flex items-center gap-2">
                            {renderedIcon}
                            <span>{label}</span>
                        </span>
                    </label>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    {...props}
                    className={`w-full py-1 px-2 rounded bg-neutral-200 ${className ?? ""}`}
                />
            </div>
        )
    }
)

Input.displayName = "Input"

export default Input
