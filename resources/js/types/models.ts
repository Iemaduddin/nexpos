export type CategoryParentOption = {
    id: number;
    name: string;
};

export type Category = {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    parent?: CategoryParentOption | null;
    products_count?: number;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type Brand = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    products_count?: number;
};

export type Unit = {
    id: number;
    name: string;
    symbol: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    products_count?: number;
};

export type OptionItem = {
    id: number;
    name: string;
};

export type UnitOption = OptionItem & {
    symbol: string;
};

export type ProductVariant = {
    id: number;
    product_id: number;
    name: string;
    sku: string;
    barcode: string | null;
    cost_price: number;
    selling_price: number;
    low_stock_threshold: number;
    is_active: boolean;
};

export type Product = {
    id: number;
    sku: string;
    barcode: string | null;
    name: string;
    slug: string;
    category_id: number;
    brand_id: number | null;
    unit_id: number;
    cost_price: number;
    selling_price: number;
    tax_rate: number | string;
    track_inventory: boolean;
    low_stock_threshold: number;
    image_path: string | null;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    category?: { id: number; name: string } | null;
    unit?: { id: number; symbol: string } | null;
    variants?: ProductVariant[];
    stock?: number;
};

export type StoreOption = OptionItem & {
    is_main?: boolean;
};

export type SalePayment = {
    id: number;
    method: string;
    amount: number;
    reference_no: string | null;
    paid_at: string | null;
};

export type Sale = {
    id: number;
    number: string;
    store_id: number;
    customer_id: number | null;
    cashier_id: number;
    status: 'draft' | 'completed' | 'refunded' | 'partial_refund' | 'cancelled';
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    paid_total: number;
    change_amount: number;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    store?: { id: number; name: string } | null;
    customer?: { id: number; name: string; phone?: string | null } | null;
    cashier?: { id: number; name: string } | null;
    items?: SaleItem[];
    payments?: SalePayment[];
    returns?: SaleReturnSummary[];
};

export type SaleItem = {
    id: number;
    sale_id: number;
    product_id: number;
    variant_id: number | null;
    qty: number;
    unit_price: number;
    cost_price: number;
    discount: number;
    subtotal: number;
    product?: { id: number; name: string; sku: string } | null;
    variant?: { id: number; name: string; sku: string } | null;
};

export type SaleReturnSummary = {
    id: number;
    number: string;
    total_refund: number;
    created_at: string;
};

export type SaleReturnItem = {
    id: number;
    sale_return_id: number;
    sale_item_id: number | null;
    product_id: number;
    variant_id: number | null;
    qty: number;
    refund_amount: number;
};

export type SaleReturn = {
    id: number;
    number: string;
    sale_id: number;
    store_id: number;
    reason: string | null;
    total_refund: number;
    created_at: string;
    sale?: { id: number; number: string } | null;
    store?: { id: number; name: string } | null;
    creator?: { id: number; name: string } | null;
    items?: SaleReturnItem[];
};

export type CashSession = {
    id: number;
    store_id: number;
    opened_by: number;
    closed_by: number | null;
    opening_balance: number;
    closing_expected: number | null;
    closing_actual: number | null;
    difference: number | null;
    status: 'open' | 'closed';
    opened_at: string | null;
    closed_at: string | null;
    store?: { id: number; name: string } | null;
    opener?: { id: number; name: string } | null;
    closer?: { id: number; name: string } | null;
    expected?: number;
};

export type Overview = {
    revenue: number;
    refunds: number;
    net_revenue: number;
    transactions: number;
    avg_transaction: number;
    items_sold: number;
    profit: number;
};

export type TopProduct = {
    id: number;
    name: string;
    sku: string;
    qty: number;
    revenue: number;
};

export type LowStockItem = {
    id: number;
    name: string;
    sku: string;
    stock: number;
    threshold: number;
};

export type DailyRow = {
    date: string;
    label: string;
    revenue: number;
    refunds: number;
    transactions: number;
    profit: number;
};

export type HourlySales = {
    hour: number;
    label: string;
    transactions: number;
    revenue: number;
};

export type PaymentSummary = {
    method: string;
    amount: number;
    transactions: number;
};

export type StockSummary = {
    name: string;
    value: number;
};

export type CategoryRevenue = {
    name: string;
    revenue: number;
};

export type ForecastDigest = {
    product: string;
    sku: string;
    qty: number;
    from: string;
    to: string;
    confidence: string;
};

export type AffinityPair = {
    product: string;
    with: string;
    confidence: number;
};

export type Store = {
    id: number;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    is_main: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    users_count?: number;
    sales_count?: number;
    purchases_count?: number;
};

export type BusinessSetting = {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_path: string | null;
    currency: string;
    timezone: string;
    default_tax_rate: number | string;
    receipt_header: string | null;
    receipt_footer: string | null;
    enabled_payment_methods: string[] | null;
    rounding_unit: number;
    max_discount_percent: number | string;
    default_low_stock_threshold: number;
};

export type Anomaly = {
    id: number;
    date: string;
    type: string;
    severity: string;
    score: number | string;
    detail?: { note?: string | null } | null;
    status: string;
};

export type AiConversation = {
    id: number;
    title: string;
    updated_at: string;
};

export type AiMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export type DocumentExtractedItem = {
    name: string;
    qty: number;
    price: number;
};

export type DocumentExtracted = {
    supplier_name: string | null;
    number: string | null;
    date: string | null;
    total: number | null;
    items: DocumentExtractedItem[];
    raw_text: string;
    avg_confidence: number;
};

export type Document = {
    id: number;
    type: string;
    status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'verified';
    ocr_text: string | null;
    extracted_data: DocumentExtracted | null;
    supplier_id: number | null;
    purchase_id: number | null;
    processed_at: string | null;
    created_at: string;
    updated_at: string;
    supplier?: { id: number; name: string } | null;
    purchase?: { id: number; number: string } | null;
};

export type Customer = {
    id: number;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    birthdate: string | null;
    loyalty_points: number;
    total_spent: number;
    transaction_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type RoleOption = {
    id: number;
    name: string;
};

export type ManagedUser = {
    id: number;
    name: string;
    email: string;
    store_id: number | null;
    is_active: boolean;
    role?: string | null;
    roles?: { id: number; name: string }[];
    store?: { id: number; name: string } | null;
};

export type Supplier = {
    id: number;
    code: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    purchases_count?: number;
};

export type PosProductVariant = {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number;
    stock: number | null;
};

export type PosProduct = {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    selling_price: number;
    track_inventory: boolean;
    unit: string;
    stock: number | null;
    variants: PosProductVariant[];
};

export type PosCustomer = OptionItem & {
    phone?: string | null;
};

export type ReturnableItem = {
    id: number;
    name: string;
    variant?: string | null;
    sku: string;
    qty: number;
    qty_returned: number;
    unit_price: number;
    discount: number;
};

export type ProductOption = {
    id: number;
    name: string;
    sku: string;
    cost_price: number;
    variants: { id: number; name: string; sku: string }[];
};

export type PurchaseItem = {
    id: number;
    purchase_id: number;
    product_id: number;
    variant_id: number | null;
    qty_ordered: number;
    qty_received: number;
    cost_price: number;
    subtotal: number;
    product?: { id: number; name: string; sku: string } | null;
    variant?: { id: number; name: string; sku: string } | null;
};

export type Purchase = {
    id: number;
    number: string;
    supplier_id: number;
    store_id: number;
    status: 'draft' | 'ordered' | 'partial' | 'received' | 'cancelled';
    subtotal: number;
    discount: number;
    tax: number;
    grand_total: number;
    paid_amount: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    ordered_at: string | null;
    expected_at: string | null;
    received_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    supplier?: { id: number; name: string; phone?: string | null } | null;
    store?: { id: number; name: string } | null;
    items?: PurchaseItem[];
    creator?: { id: number; name: string } | null;
};

export type StockAdjustmentItem = {
    id: number;
    product_id: number;
    variant_id: number | null;
    qty_system: number;
    qty_actual: number;
    qty_diff: number;
    qty_system_now?: number;
    product?: { id: number; name: string; sku: string } | null;
    variant?: { id: number; name: string; sku: string } | null;
};

export type StockAdjustment = {
    id: number;
    number: string;
    store_id: number;
    type: 'correction' | 'damaged' | 'lost' | 'found';
    status: 'draft' | 'approved';
    reason: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    store?: { id: number; name: string } | null;
    items?: StockAdjustmentItem[];
    items_count?: number;
    creator?: { id: number; name: string } | null;
    approver?: { id: number; name: string } | null;
};
