export type StaffRole = "SUPER_ADMIN" | "ADMIN" | "KITCHEN" | "DELIVERY";

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "DELIVERY_FAILED";

export type OrderSource =
  | "WEBSITE"
  | "WHATSAPP_DM"
  | "WHATSAPP_GROUP"
  | "PHONE_CALL"
  | "WALK_IN"
  | "ADMIN_MANUAL";

export type PaymentMethod = "MPESA" | "CASH";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type FulfilmentType = "DELIVERY" | "PICKUP";

export type Category = {
  id: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type MenuItem = {
  id: string;
  category_id?: string | null;
  category?: string;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
  is_available: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CartLine = {
  item: MenuItem;
  quantity: number;
};

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  order_count?: number;
  total_spent?: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  changed_by?: string | null;
  old_status?: OrderStatus | null;
  new_status: OrderStatus;
  note?: string | null;
  created_at: string;
  changer_name?: string;
};

export type Payment = {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transaction_reference?: string | null;
  paid_at?: string | null;
  confirmed_by?: string | null;
  created_at: string;
};

export type MpesaTransaction = {
  id: string;
  payment_id: string;
  checkout_request_id?: string | null;
  merchant_request_id?: string | null;
  phone_number?: string | null;
  receipt_number?: string | null;
  result_code?: string | null;
  result_description?: string | null;
  callback_payload?: any;
  created_at: string;
};

export type Delivery = {
  id: string;
  order_id: string;
  rider_id?: string | null;
  status: string;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
  rider_name?: string;
  rider_phone?: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  created_by?: string | null;
  source: OrderSource;
  status: OrderStatus;
  fulfilment_type: FulfilmentType;
  delivery_address?: string | null;
  instructions?: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_status: PaymentStatus;
  cancellation_reason?: string | null;
  tracking_token_hash?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  customer?: Customer;
  items?: OrderItem[];
  payments?: Payment[];
  delivery?: Delivery | null;
  history?: OrderStatusHistory[];
};

export type WhatsAppMessage = {
  id: string;
  external_message_id: string;
  sender_phone: string;
  message_body: string;
  message_type?: string | null;
  processing_status: "REVIEW_REQUIRED" | "PROCESSED" | "IGNORED" | "FAILED";
  linked_order_id?: string | null;
  received_at: string;
  processed_at?: string | null;
};

export type StaffProfile = {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  phone?: string | null;
  created_at: string;
};
