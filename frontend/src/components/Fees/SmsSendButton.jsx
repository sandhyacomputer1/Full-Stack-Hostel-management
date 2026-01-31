import React, { useState } from 'react';
import { MessageSquare, Send, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Reusable SMS Send Button Component
 * @param {Object} props
 * @param {Function} props.onSend - Async function to call when button is clicked
 * @param {string} props.label - Button label text
 * @param {string} props.variant - Button variant: 'primary', 'danger', 'success', 'warning'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {string} props.icon - Icon type: 'message', 'send', 'alert'
 * @param {boolean} props.disabled - Disable button
 * @param {string} props.successMessage - Toast message on success
 * @param {string} props.errorMessage - Toast message on error
 */
const SmsSendButton = ({
    onSend,
    label = 'Send SMS',
    variant = 'primary',
    size = 'sm',
    icon = 'message',
    disabled = false,
    successMessage = 'SMS sent successfully',
    errorMessage = 'Failed to send SMS',
    className = '',
}) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading || disabled) return;

        setLoading(true);

        try {
            const response = await onSend();
            const msg = response?.data?.message || successMessage;

            // Check for mock warning
            if (response?.data?.isMock) {
                toast(msg, {
                    icon: '⚠️',
                    style: {
                        background: '#FFFBEB',
                        color: '#B45309',
                    },
                    duration: 4000
                });
            } else {
                toast.success(msg);
            }
        } catch (error) {
            console.error('SMS send error:', error);
            const message = error?.response?.data?.message || errorMessage;
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Icon selection
    const IconComponent = {
        message: MessageSquare,
        send: Send,
        alert: AlertTriangle,
        check: CheckCircle,
    }[icon] || MessageSquare;

    // Variant classes
    const variantClasses = {
        primary: 'btn-primary',
        danger: 'btn-danger',
        success: 'btn-success',
        warning: 'bg-orange-600 hover:bg-orange-700 text-white',
        outline: 'btn-outline',
    }[variant] || 'btn-primary';

    // Size classes
    const sizeClasses = {
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg',
    }[size] || 'btn-sm';

    return (
        <button
            onClick={handleClick}
            disabled={loading || disabled}
            className={`btn ${variantClasses} ${sizeClasses} flex items-center gap-2 ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${className}`}
            type="button"
        >
            {loading ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                </>
            ) : (
                <>
                    <IconComponent className="h-4 w-4" />
                    <span>{label}</span>
                </>
            )}
        </button>
    );
};

export default SmsSendButton;
