import React from "react"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, id, className, ...props }, ref) => {
        const inputId = id ?? React.useId()

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium">
                        {label}
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
