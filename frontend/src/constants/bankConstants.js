// src/constants/bankConstants.js

export const TRANSACTION_TYPES = {
    CREDIT: 'credit',
    DEBIT: 'debit',
};

export const TRANSACTION_CATEGORIES = {
    // Credit categories
    DEPOSIT: 'deposit',
    CASH_DEPOSIT: 'cash_deposit',
    ONLINE_DEPOSIT: 'online_deposit',
    REFUND: 'refund',
    REVERSAL: 'reversal',

    // Debit categories
    CANTEEN: 'canteen',
    FINE: 'fine',
    HOSTEL_FEE: 'hostel_fee',
    LAUNDRY: 'laundry',
    STATIONERY: 'stationery',
    WITHDRAWAL: 'withdrawal',
    OTHER: 'other',
};

export const ACCOUNT_STATUS = {
    ACTIVE: 'active',
    FROZEN: 'frozen',
    CLOSED: 'closed',
};

export const CATEGORY_LABELS = {
    deposit: 'Cash Deposit',
    cash_deposit: 'Cash Deposit',
    online_deposit: 'Online Deposit',
    canteen: 'Canteen',
    fine: 'Fine',
    hostel_fee: 'Hostel Fee',
    laundry: 'Laundry',
    stationery: 'Stationery',
    refund: 'Refund',
    reversal: 'Reversal',
    manual_adjustment: 'Manual Adjustment',
    withdrawal: 'Withdrawal',
    other: 'Other',
};

export const DEBIT_CATEGORIES = [
    { value: 'canteen', label: 'Canteen' },
    { value: 'fine', label: 'Fine' },
    { value: 'hostel_fee', label: 'Hostel Fee' },
    { value: 'laundry', label: 'Laundry' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'other', label: 'Other' },
];

export const CREDIT_CATEGORIES = [
    { value: 'cash_deposit', label: 'Cash Deposit' },
    { value: 'online_deposit', label: 'Online Deposit' },
    { value: 'deposit', label: 'Deposit' },
];

export const LOW_BALANCE_THRESHOLD = 100;
