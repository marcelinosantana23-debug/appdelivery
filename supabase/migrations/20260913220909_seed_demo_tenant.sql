/*
# Seed demo tenant with categories and products

Creates a demo lanchonete "Burger Town" with slug "burger-town" and populates
categories and products so the app has data to show on first load.

Also creates the super_admin tenant_admins record placeholder — the actual
auth.users row for the super admin will be created by the edge function
or manually. For demo purposes, we create a SECURITY DEFINER function
that allows seeding the super admin after they sign up.
*/

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(p_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  base_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Insert demo tenant
INSERT INTO tenants (id, name, slug, logo, tagline, whatsapp, pix_key, pix_key_type, delivery_fee, address, hours, primary_color, primary_dark, primary_light, accent_color, is_open, is_active)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', 'Burger Town', 'burger-town', '🍔', 'Hambúrgueres artesanais na chama', '5511999999999', 'contato@burgertown.com.br', 'email', 6.0, 'Rua das Chamas, 420 - Centro', '18:00 - 23:30', '#E63946', '#C1121F', '#F77F00', '#FCBF49', true, true
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'burger-town');

-- Insert categories for demo tenant
INSERT INTO categories (tenant_id, name, icon, sort_order)
SELECT 'a1b2c3d4-0000-0000-0000-000000000001', cat.name, cat.icon, cat.sort_order
FROM (VALUES
  ('Lanches', '🍔', 0),
  ('Combos', '🍟', 1),
  ('Porções', '🍗', 2),
  ('Bebidas', '🥤', 3),
  ('Sobremesas', '🍰', 4)
) AS cat(name, icon, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND name = cat.name
);

-- Insert products for demo tenant
INSERT INTO products (tenant_id, category_id, name, description, price, image, available, sort_order)
SELECT 
  'a1b2c3d4-0000-0000-0000-000000000001',
  c.id,
  p.name, p.description, p.price, p.image, p.available, p.sort_order
FROM (VALUES
  ('Lanches', 'Classic Burger', 'Pão brioche, hambúrguer 160g, queijo cheddar, alface, tomate e cebola caramelizada.', 22.0, 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=600', true, 0),
  ('Lanches', 'Double Cheese Bacon', 'Dois hambúrgueres 160g, cheddar duplo, bacon crocante e maionese da casa.', 32.0, 'https://images.pexels.com/photos/3649174/pexels-photo-3649174.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1),
  ('Lanches', 'Smash Burger', 'Smash de 120g prensado na chapa, queijo prato, picles e molho especial.', 25.0, 'https://images.pexels.com/photos/2702674/pexels-photo-2702674.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2),
  ('Lanches', 'Veggie Burger', 'Hambúrguer de grão-de-bico, queijo vegano, rúcula e tomate seco.', 26.0, 'https://images.pexels.com/photos/1527609/pexels-photo-1527609.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3),
  ('Combos', 'Combo Classic', 'Classic Burger + Batata frita média + Refrigerante lata 350ml.', 32.0, 'https://images.pexels.com/photos/3719000/pexels-photo-3719000.jpeg?auto=compress&cs=tinysrgb&w=600', true, 0),
  ('Combos', 'Combo Double Bacon', 'Double Cheese Bacon + Batata frita grande + Milkshake 300ml.', 46.0, 'https://images.pexels.com/photos/3622442/pexels-photo-3622442.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1),
  ('Porções', 'Batata Frita Tradicional', 'Porção de batata frita crocante com sal e molho da casa.', 18.0, 'https://images.pexels.com/photos/115740/pexels-photo-115740.jpeg?auto=compress&cs=tinysrgb&w=600', true, 0),
  ('Porções', 'Onion Rings', 'Anéis de cebola empanados e fritos, acompanha molho ranch.', 20.0, 'https://images.pexels.com/photos/4109111/pexels-photo-4109111.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1),
  ('Porções', 'Nuggets de Frango', '10 unidades de nuggets crocantes com molho à escolha.', 22.0, 'https://images.pexels.com/photos/60616/fried-chicken-chicken-fried-crunchy-60616.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2),
  ('Bebidas', 'Coca-Cola Lata', 'Refrigerante Coca-Cola lata 350ml gelado.', 7.0, 'https://images.pexels.com/photos/2983100/pexels-photo-2983100.jpeg?auto=compress&cs=tinysrgb&w=600', true, 0),
  ('Bebidas', 'Guaraná Antarctica', 'Refrigerante Guaraná Antarctica lata 350ml.', 6.5, 'https://images.pexels.com/photos/1292294/pexels-photo-1292294.jpeg?auto=compress&cs=tinysrgb&w=600', true, 1),
  ('Bebidas', 'Milkshake Chocolate', 'Milkshake cremoso de chocolate 300ml.', 14.0, 'https://images.pexels.com/photos/3768582/pexels-photo-3768582.jpeg?auto=compress&cs=tinysrgb&w=600', true, 2),
  ('Bebidas', 'Suco Natural Laranja', 'Suco de laranja natural 400ml.', 9.0, 'https://images.pexels.com/photos/1346157/pexels-photo-1346157.jpeg?auto=compress&cs=tinysrgb&w=600', true, 3),
  ('Sobremesas', 'Brownie com Sorvete', 'Brownie de chocolate quente com bola de sorvete de creme.', 16.0, 'https://images.pexels.com/photos/2910081/pexels-photo-2910081.jpeg?auto=compress&cs=tinysrgb&w=600', true, 0),
  ('Sobremesas', 'Petit Gateau', 'Bolo de chocolate com recheio cremoso e sorvete.', 18.0, 'https://images.pexels.com/photos/3821247/pexels-photo-3821247.jpeg?auto=compress&cs=tinysrgb&w=600', false, 1)
) AS p(category_name, name, description, price, image, available, sort_order)
JOIN categories c ON c.tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND c.name = p.category_name
WHERE NOT EXISTS (
  SELECT 1 FROM products pr WHERE pr.tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001' AND pr.name = p.name
);

-- Insert product options for demo products
INSERT INTO product_options (product_id, name, price)
SELECT pr.id, opt.name, opt.price
FROM products pr
JOIN (VALUES
  ('Classic Burger', 'Queijo extra', 3.0),
  ('Classic Burger', 'Bacon extra', 4.0),
  ('Classic Burger', 'Retirar cebola', 0),
  ('Classic Burger', 'Retirar tomate', 0),
  ('Double Cheese Bacon', 'Queijo extra', 3.0),
  ('Double Cheese Bacon', 'Bacon extra', 4.0),
  ('Double Cheese Bacon', 'Retirar cebola', 0),
  ('Double Cheese Bacon', 'Molho Barbecue', 2.0),
  ('Double Cheese Bacon', 'Molho Chipotle', 2.0),
  ('Smash Burger', 'Queijo extra', 3.0),
  ('Smash Burger', 'Bacon extra', 4.0),
  ('Smash Burger', 'Retirar cebola', 0),
  ('Veggie Burger', 'Queijo extra', 3.0),
  ('Veggie Burger', 'Bacon extra', 4.0),
  ('Combo Classic', 'Queijo extra', 3.0),
  ('Combo Classic', 'Bacon extra', 4.0),
  ('Combo Double Bacon', 'Queijo extra', 3.0),
  ('Combo Double Bacon', 'Bacon extra', 4.0),
  ('Combo Double Bacon', 'Molho Barbecue', 2.0),
  ('Batata Frita Tradicional', 'Molho Barbecue', 2.0),
  ('Batata Frita Tradicional', 'Molho Chipotle', 2.0),
  ('Batata Frita Tradicional', 'Molho da Casa', 2.0),
  ('Onion Rings', 'Molho Barbecue', 2.0),
  ('Onion Rings', 'Molho Chipotle', 2.0),
  ('Nuggets de Frango', 'Molho Barbecue', 2.0),
  ('Nuggets de Frango', 'Molho Chipotle', 2.0),
  ('Coca-Cola Lata', 'Com gelo', 0),
  ('Coca-Cola Lata', 'Sem gelo', 0),
  ('Guaraná Antarctica', 'Com gelo', 0),
  ('Guaraná Antarctica', 'Sem gelo', 0)
) AS opt(product_name, name, price)
ON pr.name = opt.product_name AND pr.tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001'
WHERE NOT EXISTS (
  SELECT 1 FROM product_options po WHERE po.product_id = pr.id AND po.name = opt.name
);
