-- ===================================================================
-- A YEAR OR TWO DELICACIES (AYOTD)
-- Comprehensive Development Seed Script
-- ===================================================================

-- 1. Insert Categories
insert into public.categories (name, description, sort_order, is_active) values
('Special Combos', 'Value-packed meal bundles for campus foodies', 1, true),
('Main Meals', 'Authentic hearty dishes prepared fresh daily', 2, true),
('Student Favourites', 'Delicious, filling & budget-friendly classics', 3, true),
('Fast Bites & Sides', 'Quick, tasty snacks and savoury pastry bites', 4, true),
('Chilled Drinks', 'Fresh seasonal juices and iced refreshments', 5, true)
on conflict (name) do update set
  description = excluded.description,
  sort_order = excluded.sort_order;

-- 2. Insert Menu Items with realistic Kenyan campus pricing and photos
insert into public.menu_items (category_id, name, description, price, image_url, is_available, is_active)
select c.id, v.name, v.description, v.price, v.image_url, true, true
from (values
 ('Special Combos', 'Swahili Chicken Biryani', 'Tender chicken slow-cooked in rich Swahili aromatics, served with layered saffron basmati rice and fresh kachumbari.', 320::numeric, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80'),
 ('Main Meals', 'Coastal Chicken Pilau', 'Fragrant spiced rice infused with whole cumin, cardamom and garlic, paired with juicy chicken drumstick and kachumbari.', 250::numeric, 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80'),
 ('Main Meals', 'Slow-Braised Beef Stew & Fluffy Rice', 'Succulent cubes of beef simmered in a rich tomato, coriander and onion gravy, served with aromatic steamed rice.', 280::numeric, 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=800&q=80'),
 ('Main Meals', 'Fresh Tilapia Wet Fry with Ugali & Greens', 'Whole fresh Lake Victoria tilapia pan-fried and simmered in a spicy tomato relish with steaming hot ugali and sukuma wiki.', 380::numeric, 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&q=80'),
 ('Student Favourites', 'Double Chapati with Rich Yellow Beans (Madondo)', 'Two flaky, layered chapatis served with coconut-infused yellow beans in thick onion-tomato sauce.', 150::numeric, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80'),
 ('Student Favourites', 'Spiced Green Grams (Dengu) & White Rice', 'Tender whole green grams tempered with ginger, garlic, and fresh dhania, served with fluffy white rice.', 180::numeric, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80'),
 ('Fast Bites & Sides', 'AYOTD Sizzling Chips Masala', 'Fresh hand-cut golden fries tossed in our signature garlic-chilli masala sauce, sprinkled with fresh spring onions.', 180::numeric, 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&q=80'),
 ('Fast Bites & Sides', 'Crispy Beef Samosas (Pair)', 'Crispy, hand-rolled golden pastry pockets filled with seasoned minced beef, green chillies, and aromatic spices.', 100::numeric, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80'),
 ('Chilled Drinks', 'Fresh Tropical Passion & Mango Blend', 'Pure, freshly pressed Kenyan passion fruit and sweet mango juice over ice. 100% natural with no artificial sweeteners.', 120::numeric, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&q=80'),
 ('Chilled Drinks', 'Chilled Hibiscus (Zobo) Iced Tea', 'Brewed roselle hibiscus flowers infused with fresh ginger, mint, and a touch of local honey.', 100::numeric, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80')
) as v(category, name, description, price, image_url)
join public.categories c on c.name = v.category
where not exists (select 1 from public.menu_items m where m.name = v.name);

-- 3. Insert Test Customers
insert into public.customers (id, full_name, phone) values
('c0000000-0000-0000-0000-000000000001', 'Kevin Otieno', '0712345678'),
('c0000000-0000-0000-0000-000000000002', 'Mercy Wanjiku', '0723456789'),
('c0000000-0000-0000-0000-000000000003', 'David Kimani', '0734567890')
on conflict (phone) do nothing;

-- 4. Customer Addresses
insert into public.customer_addresses (customer_id, label, location, instructions)
select id, 'Campus Hostel', 'Hall 4 (Moi), 3rd Floor, Room 314', 'Call on arrival'
from public.customers where phone = '0712345678'
on conflict do nothing;

-- 5. WhatsApp Incoming Messages for Staff Review
insert into public.whatsapp_messages (external_message_id, sender_phone, message_body, message_type, processing_status, received_at) values
('wamid.HBgLMjU0NzExMjIzMzQ0FQIAEhgg', '254712345678', 'Hi AYOTD, kindly send 2 plates of Coastal Chicken Pilau and 1 Fresh Passion Juice to Hall 7 Room 104. Will pay with M-Pesa.', 'text', 'REVIEW_REQUIRED', now() - interval '18 minutes'),
('wamid.HBgLMjU0NzI4ODc3NjY1FQIAEhgg', '254728877665', 'Please prepare 1 Beef Stew & Rice for collection at 1:30 PM. Paying cash.', 'text', 'REVIEW_REQUIRED', now() - interval '35 minutes'),
('wamid.HBgLMjU0NzIyMzMzNDQ1FQIAEhgg', '254722333445', 'Order chips masala to Hostel 2 Block C room 12.', 'text', 'PROCESSED', now() - interval '80 minutes')
on conflict (external_message_id) do nothing;
